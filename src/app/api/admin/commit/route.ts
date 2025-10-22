import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isCoach, isOwner } from '@/lib/permissions';

// GitHub API configuration
const GITHUB_API_URL = 'https://api.github.com';
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'chadfurman';
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'ladder-legends-academy';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const VERCEL_DEPLOY_HOOK = process.env.VERCEL_DEPLOY_HOOK;

type ContentType = 'build-orders' | 'replays' | 'masterclasses' | 'videos' | 'coaches';
type Operation = 'create' | 'update' | 'delete';

interface CommitRequest {
  contentType: ContentType;
  operation: Operation;
  data: any;
}

/**
 * POST /api/admin/commit
 *
 * Commits content changes to GitHub and triggers Vercel deploy
 *
 * Request body:
 * {
 *   contentType: 'build-orders' | 'replays' | 'masterclasses' | 'videos' | 'coaches',
 *   operation: 'create' | 'update' | 'delete',
 *   data: { ... content object ... }
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
    const { contentType, operation, data } = body;

    // 3. Verify permissions
    const canEdit = isCoach(session);
    const canEditCoaches = isOwner(session);

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to edit content' },
        { status: 403 }
      );
    }

    if (contentType === 'coaches' && !canEditCoaches) {
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

    // 5. Get file path
    const filePath = `src/data/${contentType}.json`;

    // 6. Fetch current file from GitHub
    const fileUrl = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
    const fileResponse = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!fileResponse.ok) {
      console.error('Failed to fetch file from GitHub:', await fileResponse.text());
      return NextResponse.json(
        { error: 'Failed to fetch current content from GitHub' },
        { status: 500 }
      );
    }

    const fileData = await fileResponse.json();
    const currentContent = JSON.parse(
      Buffer.from(fileData.content, 'base64').toString('utf-8')
    );

    // 7. Apply operation
    let updatedContent: any[];
    switch (operation) {
      case 'create':
        updatedContent = [...currentContent, data];
        break;

      case 'update':
        updatedContent = currentContent.map((item: any) =>
          item.id === data.id ? data : item
        );
        break;

      case 'delete':
        updatedContent = currentContent.filter((item: any) => item.id !== data.id);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

    // 8. Format JSON with 2-space indentation
    const newContentString = JSON.stringify(updatedContent, null, 2) + '\n';
    const newContentBase64 = Buffer.from(newContentString, 'utf-8').toString('base64');

    // 9. Commit to GitHub
    const commitMessage = `Admin update by ${session.user.name || session.user.email}: ${operation} ${contentType}/${data.id}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: ${session.user.name || 'User'} <${session.user.email || 'noreply@example.com'}>`;

    const commitResponse = await fetch(fileUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage,
        content: newContentBase64,
        sha: fileData.sha,
        branch: 'main',
      }),
    });

    if (!commitResponse.ok) {
      console.error('Failed to commit to GitHub:', await commitResponse.text());
      return NextResponse.json(
        { error: 'Failed to commit changes to GitHub' },
        { status: 500 }
      );
    }

    const commitData = await commitResponse.json();

    // 10. Trigger Vercel deploy webhook (if configured)
    if (VERCEL_DEPLOY_HOOK) {
      try {
        await fetch(VERCEL_DEPLOY_HOOK, { method: 'POST' });
      } catch (error) {
        console.error('Failed to trigger Vercel deploy:', error);
        // Don't fail the request if webhook fails
      }
    }

    // 11. Return success
    return NextResponse.json({
      success: true,
      message: `Successfully ${operation}d ${contentType}`,
      commit: {
        sha: commitData.commit.sha,
        url: commitData.commit.html_url,
      },
    });

  } catch (error) {
    console.error('Error in /api/admin/commit:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
