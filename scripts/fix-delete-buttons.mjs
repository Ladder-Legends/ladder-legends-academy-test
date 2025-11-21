#!/usr/bin/env node

/**
 * Fix all broken delete buttons by adding `addChange()` calls
 * This ensures delete operations are saved to local storage and can be committed
 */

import { readFileSync, writeFileSync } from 'fs';

const fixes = [
  {
    file: 'src/app/build-orders/[id]/build-order-detail-client.tsx',
    contentType: 'build-orders',
    itemName: 'buildOrder',
    displayName: 'build order',
    oldDeletePattern: /const handleDelete = \(\) => \{\s+if \(confirm\(`Are you sure you want to delete "\$\{buildOrder\.name\}"\?`\)\) \{\s+console\.log\('Delete build order:', buildOrder\.id\);\s+\/\/ The actual delete would be handled by the modal\/CMS system\s+\}\s+\};/,
    searchPattern: /('use client';\n\nimport[^;]+;\n)/,
    needsImports: true,
  },
  {
    file: 'src/app/masterclasses/[id]/masterclass-detail-client.tsx',
    contentType: 'masterclasses',
    itemName: 'masterclass',
    displayName: 'masterclass',
    oldDeletePattern: /const handleDelete = \(\) => \{\s+if \(confirm\(`Are you sure you want to delete "\$\{masterclass\.title\}"\?`\)\) \{\s+console\.log\('Delete masterclass:', masterclass\.id\);\s+\/\/ The actual delete would be handled by the modal\/CMS system\s+\}\s+\};/,
    searchPattern: /('use client';\n\nimport[^;]+;\n)/,
    needsImports: true,
  },
  {
    file: 'src/app/replays/[id]/replay-detail-client.tsx',
    contentType: 'replays',
    itemName: 'replay',
    displayName: 'replay',
    oldDeletePattern: /const handleDelete = \(\) => \{\s+if \(confirm\(`Are you sure you want to delete "\$\{replay\.title\}"\?`\)\) \{\s+console\.log\('Delete replay:', replay\.id\);\s+\/\/ The actual delete would be handled by the modal\/CMS system\s+\}\s+\};/,
    searchPattern: /('use client';\n\nimport[^;]+;\n)/,
    needsImports: true,
  },
  {
    file: 'src/app/events/[id]/event-detail-client.tsx',
    contentType: 'events',
    itemName: 'event',
    displayName: 'event',
    oldDeletePattern: /const handleDelete = \(\) => \{\s+if \(confirm\(`Are you sure you want to delete "\$\{event\.title\}"\?`\)\) \{\s+console\.log\('Delete event:', event\.id\);\s+\/\/ The actual delete would be handled by the modal\/CMS system\s+\}\s+\};/,
    searchPattern: /('use client';\n\nimport[^;]+;\n)/,
    needsImports: true,
  },
];

console.log('🔧 Fixing delete buttons...\n');

let fixedCount = 0;

for (const fix of fixes) {
  try {
    console.log(`📝 Processing ${fix.file}...`);
    let content = readFileSync(fix.file, 'utf8');
    let modified = false;

    // Step 1: Add imports if needed
    if (fix.needsImports && !content.includes('usePendingChanges')) {
      const importToAdd = "import { usePendingChanges } from '@/lib/pending-changes';\nimport { toast } from 'sonner';\n";

      // Find the last import statement
      const lastImportMatch = content.match(/import[^;]+;(?=\n\n)/g);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        content = content.replace(lastImport, lastImport + '\n' + importToAdd);
        modified = true;
        console.log('  ✓ Added imports');
      }
    }

    // Step 2: Add usePendingChanges hook if not present
    if (!content.includes('const { addChange } = usePendingChanges()')) {
      // Find where to insert it (after other hooks like useSession, useState, etc.)
      const hookInsertMatch = content.match(/(const \{ data: session[^}]+\} = useSession\(\);)/);
      if (hookInsertMatch) {
        content = content.replace(hookInsertMatch[0], hookInsertMatch[0] + '\n  const { addChange } = usePendingChanges();');
        modified = true;
        console.log('  ✓ Added usePendingChanges hook');
      }
    }

    // Step 3: Fix the delete handler
    const oldPattern = new RegExp(
      `console\\.log\\('Delete ${fix.displayName}:', ${fix.itemName}\\.id\\);\\s+\\/\\/ The actual delete would be handled by the modal\\/CMS system`,
      'g'
    );

    if (content.includes(`console.log('Delete ${fix.displayName}:', ${fix.itemName}.id)`)) {
      const newDeleteCode = `addChange({
        id: ${fix.itemName}.id,
        contentType: '${fix.contentType}',
        operation: 'delete',
        data: ${fix.itemName} as unknown as Record<string, unknown>,
      });
      toast.success('${fix.displayName.charAt(0).toUpperCase() + fix.displayName.slice(1)} marked for deletion (pending commit)');`;

      content = content.replace(oldPattern, newDeleteCode);
      modified = true;
      console.log('  ✓ Fixed delete handler');
    }

    if (modified) {
      writeFileSync(fix.file, content, 'utf8');
      console.log(`  ✅ Successfully fixed ${fix.file}\n`);
      fixedCount++;
    } else {
      console.log(`  ⏭️  No changes needed for ${fix.file}\n`);
    }
  } catch (error) {
    console.error(`  ❌ Error fixing ${fix.file}:`, error.message, '\n');
  }
}

// Special case: Coach detail client has video delete
try {
  console.log('📝 Processing src/app/coaches/[id]/coach-detail-client.tsx (video delete)...');
  let content = readFileSync('src/app/coaches/[id]/coach-detail-client.tsx', 'utf8');
  let modified = false;

  if (!content.includes('usePendingChanges')) {
    const importToAdd = "import { usePendingChanges } from '@/lib/pending-changes';\nimport { toast } from 'sonner';\n";
    const lastImportMatch = content.match(/import[^;]+;(?=\n\n)/g);
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      content = content.replace(lastImport, lastImport + '\n' + importToAdd);
      modified = true;
      console.log('  ✓ Added imports');
    }
  }

  if (!content.includes('const { addChange } = usePendingChanges()')) {
    const hookInsertMatch = content.match(/(const \{ data: session[^}]+\} = useSession\(\);)/);
    if (hookInsertMatch) {
      content = content.replace(hookInsertMatch[0], hookInsertMatch[0] + '\n  const { addChange } = usePendingChanges();');
      modified = true;
      console.log('  ✓ Added usePendingChanges hook');
    }
  }

  if (content.includes("console.log('Delete video:', video.id)")) {
    const newDeleteCode = `addChange({
        id: video.id,
        contentType: 'videos',
        operation: 'delete',
        data: video as unknown as Record<string, unknown>,
      });
      toast.success('Video marked for deletion (pending commit)');`;

    content = content.replace(
      /console\.log\('Delete video:', video\.id\);/g,
      newDeleteCode
    );
    modified = true;
    console.log('  ✓ Fixed delete handler');
  }

  if (modified) {
    writeFileSync('src/app/coaches/[id]/coach-detail-client.tsx', content, 'utf8');
    console.log('  ✅ Successfully fixed src/app/coaches/[id]/coach-detail-client.tsx\n');
    fixedCount++;
  } else {
    console.log('  ⏭️  No changes needed\n');
  }
} catch (error) {
  console.error('  ❌ Error fixing coach-detail-client.tsx:', error.message, '\n');
}

console.log(`\n✨ Done! Fixed ${fixedCount} file(s)`);

if (fixedCount > 0) {
  console.log('\n📌 Next steps:');
  console.log('1. Review the changes with: git diff');
  console.log('2. Test delete functionality in the app');
  console.log('3. Commit the changes');
}
