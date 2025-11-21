/**
 * OpenGraph Validation Test
 * Ensures all pages with OpenGraph metadata have proper images defined
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('OpenGraph Image Validation', () => {
  it('should have images array in all pages with openGraph metadata', () => {
    const appDir = path.join(__dirname, '../src/app');

    // Find all page.tsx files
    const findCommand = `find ${appDir} -name "page.tsx" -type f`;
    const pageFiles = execSync(findCommand, { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);

    const filesWithMissingImages: string[] = [];

    for (const file of pageFiles) {
      const content = fs.readFileSync(file, 'utf-8');

      // Check if file has openGraph
      if (content.includes('openGraph:') || content.includes('openGraph =')) {
        // Check if it has images within the openGraph section
        const openGraphMatch = content.match(/openGraph:\s*\{[\s\S]*?\n\s*\}/);
        if (openGraphMatch) {
          const openGraphSection = openGraphMatch[0];

          // Check if images is defined in the openGraph section
          if (!openGraphSection.includes('images:') && !openGraphSection.includes('images =')) {
            filesWithMissingImages.push(file.replace(appDir, 'src/app'));
          }
        }
      }
    }

    if (filesWithMissingImages.length > 0) {
      throw new Error(
        `The following pages have openGraph metadata but are missing images:\n` +
        filesWithMissingImages.map(f => `  - ${f}`).join('\n') +
        `\n\nAll pages with openGraph should include an images array with at least:\n` +
        `  images: [{ url: '...', width: 1200, height: 630, alt: '...' }]`
      );
    }

    // If we get here, all pages are valid
    expect(filesWithMissingImages).toHaveLength(0);
  });

  it('should have twitter images in all pages with twitter card metadata', () => {
    const appDir = path.join(__dirname, '../src/app');

    // Find all page.tsx files
    const findCommand = `find ${appDir} -name "page.tsx" -type f`;
    const pageFiles = execSync(findCommand, { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);

    const filesWithMissingImages: string[] = [];

    for (const file of pageFiles) {
      const content = fs.readFileSync(file, 'utf-8');

      // Check if file has twitter card with summary_large_image
      if (content.includes("card: 'summary_large_image'") || content.includes('card: "summary_large_image"')) {
        // Check if it has images in the twitter section
        const twitterMatch = content.match(/twitter:\s*\{[\s\S]*?\n\s*\}/);
        if (twitterMatch) {
          const twitterSection = twitterMatch[0];

          // Check if images is defined in the twitter section
          if (!twitterSection.includes('images:') && !twitterSection.includes('images =')) {
            filesWithMissingImages.push(file.replace(appDir, 'src/app'));
          }
        }
      }
    }

    if (filesWithMissingImages.length > 0) {
      throw new Error(
        `The following pages have twitter summary_large_image cards but are missing images:\n` +
        filesWithMissingImages.map(f => `  - ${f}`).join('\n') +
        `\n\nAll pages with summary_large_image should include:\n` +
        `  twitter: { card: 'summary_large_image', images: ['...'] }`
      );
    }

    expect(filesWithMissingImages).toHaveLength(0);
  });
});
