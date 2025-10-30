import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isCoach, isOwner } from '@/lib/permissions';

// GitHub API configuration
const GITHUB_API_URL = 'https://api.github.com';
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'Ladder-Legends';
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'ladder-legends-academy';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const VERCEL_DEPLOY_HOOK = process.env.VERCEL_DEPLOY_HOOK;
const MAX_RETRY_ATTEMPTS = 3;

type ContentType = 'build-orders' | 'replays' | 'masterclasses' | 'videos' | 'coaches';
type Operation = 'create' | 'update' | 'delete';

interface Change {
  id: string;
  contentType: ContentType;
  operation: Operation;
  data: Record<string, unknown>;
}

interface CommitRequest {
  changes: Change[];
}

interface FileInfo {
  path: string;
  sha: string;
  content: Record<string, unknown>[];
}

/**
 * Fetches current file contents from GitHub
 */
async function fetchFiles(
  contentTypes: ContentType[],
  token: string
): Promise<Record<string, FileInfo>> {
  const filesToUpdate: Record<string, FileInfo> = {};

  for (const contentType of contentTypes) {
    const filePath = `src/data/${contentType}.json`;
    const fileUrl = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;

    const fileResponse = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch ${contentType}.json: ${await fileResponse.text()}`);
    }

    const fileData = await fileResponse.json();
    const currentContent = JSON.parse(
      Buffer.from(fileData.content, 'base64').toString('utf-8')
    );

    filesToUpdate[contentType] = {
      path: filePath,
      sha: fileData.sha,
      content: currentContent,
    };
  }

  return filesToUpdate;
}

/**
 * Applies changes to file contents (pure function - easily testable!)
 */
function applyChanges(
  files: Record<string, FileInfo>,
  changesByType: Record<ContentType, Change[]>
): Record<string, FileInfo> {
  const updatedFiles = { ...files };

  for (const [contentType, typeChanges] of Object.entries(changesByType)) {
    let updatedContent = [...updatedFiles[contentType].content];

    for (const change of typeChanges) {
      switch (change.operation) {
        case 'create':
          // Only add if it doesn't already exist (idempotent)
          if (!updatedContent.some((item: Record<string, unknown>) => item.id === change.data.id)) {
            updatedContent = [...updatedContent, change.data];
          }
          break;

        case 'update':
          updatedContent = updatedContent.map((item: Record<string, unknown>) =>
            item.id === change.data.id ? change.data : item
          );
          break;

        case 'delete':
          updatedContent = updatedContent.filter((item: Record<string, unknown>) =>
            item.id !== change.data.id
          );
          break;

        default:
          throw new Error(`Invalid operation: ${change.operation}`);
      }
    }

    updatedFiles[contentType] = {
      ...updatedFiles[contentType],
      content: updatedContent,
    };
  }

  return updatedFiles;
}

/**
 * Creates a Git commit with updated files
 */
async function createGitCommit(
  files: Record<string, FileInfo>,
  commitMessage: string,
  token: string
): Promise<{ sha: string; url: string }> {
  // 1. Get current main branch commit SHA
  const branchUrl = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/main`;
  const branchResponse = await fetch(branchUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!branchResponse.ok) {
    throw new Error(`Failed to get branch info: ${await branchResponse.text()}`);
  }

  const branchData = await branchResponse.json();
  const latestCommitSha = branchData.object.sha;

  // 2. Get the tree SHA from the latest commit
  const commitUrl = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${latestCommitSha}`;
  const commitResponse = await fetch(commitUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!commitResponse.ok) {
    throw new Error(`Failed to get commit info: ${await commitResponse.text()}`);
  }

  const commitData = await commitResponse.json();
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs for all updated files
  const tree = [];
  for (const [contentType, fileInfo] of Object.entries(files)) {
    const newContentString = JSON.stringify(fileInfo.content, null, 2) + '\n';

    const blobUrl = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`;
    const blobResponse = await fetch(blobUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: newContentString,
        encoding: 'utf-8',
      }),
    });

    if (!blobResponse.ok) {
      throw new Error(`Failed to create blob for ${contentType}: ${await blobResponse.text()}`);
    }

    const blobData = await blobResponse.json();

    tree.push({
      path: fileInfo.path,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha,
    });
  }

  // 4. Create new tree
  const treeUrl = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`;
  const treeResponse = await fetch(treeUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree,
    }),
  });

  if (!treeResponse.ok) {
    throw new Error(`Failed to create tree: ${await treeResponse.text()}`);
  }

  const treeData = await treeResponse.json();

  // 5. Create new commit
  const newCommitUrl = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`;
  const newCommitResponse = await fetch(newCommitUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: commitMessage,
      tree: treeData.sha,
      parents: [latestCommitSha],
    }),
  });

  if (!newCommitResponse.ok) {
    throw new Error(`Failed to create commit: ${await newCommitResponse.text()}`);
  }

  const newCommitData = await newCommitResponse.json();

  // 6. Update the reference
  const updateRefUrl = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/main`;
  const updateRefResponse = await fetch(updateRefUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sha: newCommitData.sha,
    }),
  });

  if (!updateRefResponse.ok) {
    const errorText = await updateRefResponse.text();
    // Check if it's a conflict (someone else committed)
    if (updateRefResponse.status === 422 || errorText.includes('does not match')) {
      throw new Error('CONFLICT'); // Special error to trigger retry
    }
    throw new Error(`Failed to update branch reference: ${errorText}`);
  }

  return {
    sha: newCommitData.sha,
    url: newCommitData.html_url,
  };
}

/**
 * Attempts to commit changes with retry logic for merge conflicts
 */
async function commitWithRetry(
  changes: Change[],
  commitMessage: string,
  token: string
): Promise<{ sha: string; url: string; attempts: number }> {
  // Group changes by content type
  const changesByType = changes.reduce((acc, change) => {
    if (!acc[change.contentType]) {
      acc[change.contentType] = [];
    }
    acc[change.contentType].push(change);
    return acc;
  }, {} as Record<ContentType, Change[]>);

  const contentTypes = Object.keys(changesByType) as ContentType[];

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // 1. Fetch current files (fresh on each attempt)
      const files = await fetchFiles(contentTypes, token);

      // 2. Apply changes (pure function - idempotent)
      const updatedFiles = applyChanges(files, changesByType);

      // 3. Create Git commit (atomic operation)
      const result = await createGitCommit(updatedFiles, commitMessage, token);

      return { ...result, attempts: attempt };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // If it's a conflict and we have retries left, try again
      if (errorMessage === 'CONFLICT' && attempt < MAX_RETRY_ATTEMPTS) {
        console.log(`Merge conflict detected on attempt ${attempt}, retrying...`);
        continue;
      }

      // If we're out of retries or it's a different error, throw
      throw error;
    }
  }

  throw new Error('Failed to commit after maximum retry attempts');
}

/**
 * POST /api/admin/commit
 *
 * Commits batched content changes to GitHub in a single commit and triggers Vercel deploy
 *
 * Request body:
 * {
 *   changes: [
 *     {
 *       id: string,
 *       contentType: 'build-orders' | 'replays' | 'masterclasses' | 'videos' | 'coaches',
 *       operation: 'create' | 'update' | 'delete',
 *       data: { ... content object ... }
 *     },
 *     ...
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: CommitRequest = await request.json();
    const { changes } = body;

    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 }
      );
    }

    // 3. Verify permissions
    const canEdit = isCoach(session);
    const canEditCoaches = isOwner(session);

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to edit content' },
        { status: 403 }
      );
    }

    // Check if any changes require owner permission
    const hasCoachChanges = changes.some(c => c.contentType === 'coaches');
    if (hasCoachChanges && !canEditCoaches) {
      return NextResponse.json(
        { error: 'Forbidden - Only owners can edit coaches' },
        { status: 403 }
      );
    }

    // 4. Validate GitHub token
    if (!GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'Server configuration error - Missing GITHUB_TOKEN' },
        { status: 500 }
      );
    }

    // 5. Create commit message
    const changeSummary = changes.map(c =>
      `${c.operation} ${c.contentType}/${c.data.id}`
    ).join(', ');

    const commitMessage = `CMS batch update by ${session.user.name || session.user.email}

Changes: ${changeSummary}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: ${session.user.name || 'User'} <${session.user.email || 'noreply@example.com'}>`;

    // 6. Commit with retry logic (handles merge conflicts automatically)
    const result = await commitWithRetry(changes, commitMessage, GITHUB_TOKEN);

    console.log(`Successfully committed after ${result.attempts} attempt(s)`);

    // 7. Trigger Vercel deploy webhook (if configured)
    if (VERCEL_DEPLOY_HOOK) {
      try {
        await fetch(VERCEL_DEPLOY_HOOK, { method: 'POST' });
      } catch (error) {
        console.error('Failed to trigger Vercel deploy:', error);
        // Don't fail the request if webhook fails
      }
    }

    // 8. Return success
    return NextResponse.json({
      success: true,
      message: `Successfully committed ${changes.length} change(s) in a single commit${result.attempts > 1 ? ` (after ${result.attempts} attempts due to merge conflicts)` : ''}`,
      commit: {
        sha: result.sha,
        url: result.url,
      },
      changesApplied: changes.length,
      attempts: result.attempts,
    });

  } catch (error) {
    console.error('Error in /api/admin/commit:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
