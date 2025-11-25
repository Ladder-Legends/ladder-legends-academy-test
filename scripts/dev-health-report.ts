#!/usr/bin/env tsx

/**
 * Developer Health Report
 *
 * Generates a comprehensive report including:
 * - All API routes and their authentication status
 * - Test coverage (unit, integration, E2E)
 * - Feature discovery (UX features that need test coverage)
 * - Dynamic discovery (no hard-coded lists)
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

interface Route {
  path: string;
  file: string;
  methods: string[];
  authStatus: 'public' | 'authenticated' | 'subscriber' | 'coach' | 'owner' | 'unknown';
  authChecks: string[];
  hasTests: boolean;
  testFiles: string[];
}

interface UXFeature {
  name: string;
  type: 'paywall' | 'form' | 'modal' | 'filter' | 'video-player' | 'upload' | 'download';
  location: string;
  hasE2ETests: boolean;
}

interface TestCoverage {
  unit: {
    total: number;
    passing: number;
    coverage: number;
  };
  integration: {
    total: number;
    files: string[];
  };
  e2e: {
    total: number;
    files: string[];
  };
}

const projectRoot = process.cwd();
const appDir = join(projectRoot, 'src', 'app');
const testsDir = join(projectRoot, '__tests__');

/**
 * Recursively finds all route files in the app directory
 */
async function discoverRoutes(dir: string = appDir, routes: Route[] = []): Promise<Route[]> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      await discoverRoutes(fullPath, routes);
    } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
      // Found an API route
      const routePath = getRoutePathFromFilePath(fullPath);
      const route = await analyzeRoute(fullPath, routePath);
      routes.push(route);
    }
  }

  return routes;
}

/**
 * Converts file path to API route path
 */
function getRoutePathFromFilePath(filePath: string): string {
  const relativePath = relative(appDir, filePath);
  const pathParts = relativePath.split('/').slice(0, -1); // Remove 'route.ts'
  // If the path already starts with 'api', don't add it again
  const routeParts = pathParts.filter(p => p); // Remove empty parts
  return '/' + routeParts.join('/');
}

/**
 * Analyzes a route file to determine authentication and other properties
 */
async function analyzeRoute(filePath: string, routePath: string): Promise<Route> {
  const content = await readFile(filePath, 'utf-8');

  // Detect HTTP methods
  const methods: string[] = [];
  if (content.includes('export async function GET') || content.includes('export function GET')) methods.push('GET');
  if (content.includes('export async function POST') || content.includes('export function POST')) methods.push('POST');
  if (content.includes('export async function PUT') || content.includes('export function PUT')) methods.push('PUT');
  if (content.includes('export async function PATCH') || content.includes('export function PATCH')) methods.push('PATCH');
  if (content.includes('export async function DELETE') || content.includes('export function DELETE')) methods.push('DELETE');

  // Detect authentication checks
  const authChecks: string[] = [];
  let authStatus: Route['authStatus'] = 'unknown';

  // Check for auth() or getServerSession
  const hasAuth = content.includes('await auth()') || content.includes('getServerSession');

  if (hasAuth) {
    authChecks.push(content.includes('await auth()') ? 'auth()' : 'getServerSession');

    // Check for specific role checks using helper functions
    if (content.includes('isOwner(')) {
      authStatus = 'owner';
      authChecks.push('isOwner()');
    } else if (content.includes('isCoach(')) {
      authStatus = 'coach';
      authChecks.push('isCoach()');
    } else if (content.match(/ownerIds|owner.*include|['"]363533762576908290['"]/)) {
      authStatus = 'owner';
      authChecks.push('owner check');
    } else if (content.includes('role === "coach"') || content.includes('role: "coach"')) {
      authStatus = 'coach';
      authChecks.push('coach role');
    } else if (content.includes('hasSubscription') || content.includes('isSubscriber')) {
      authStatus = 'subscriber';
      authChecks.push('subscription check');
    } else if (content.includes('session?.user') || content.includes('if (!session')) {
      authStatus = 'authenticated';
      authChecks.push('user authentication');
    }
  } else {
    authStatus = 'public';
  }

  // Check for corresponding test files
  const testFiles: string[] = [];
  const hasTests = await findTestsForRoute(routePath, testFiles);

  return {
    path: routePath,
    file: relative(projectRoot, filePath),
    methods,
    authStatus,
    authChecks,
    hasTests,
    testFiles,
  };
}

/**
 * Finds test files related to a specific route
 */
async function findTestsForRoute(routePath: string, testFiles: string[]): Promise<boolean> {
  // Convert route path to potential test file paths
  const routePathNormalized = routePath.replace('/api/', '').replace(/\//g, '/');
  const potentialTestPaths = [
    join(testsDir, 'api', `${routePathNormalized}.test.ts`),
    join(testsDir, 'api', `${routePathNormalized}.test.tsx`),
    join(testsDir, 'api', routePathNormalized, 'route.test.ts'),
  ];

  let found = false;
  for (const testPath of potentialTestPaths) {
    if (existsSync(testPath)) {
      testFiles.push(relative(projectRoot, testPath));
      found = true;
    }
  }

  return found;
}

/**
 * Discovers UX features that should have E2E tests
 */
async function discoverUXFeatures(dir: string = join(projectRoot, 'src'), features: UXFeature[] = []): Promise<UXFeature[]> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    // Skip node_modules, .next, etc.
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    if (entry.isDirectory()) {
      await discoverUXFeatures(fullPath, features);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      const content = await readFile(fullPath, 'utf-8');
      const location = relative(projectRoot, fullPath);

      // Detect paywall features
      if (content.includes('hasSubscription') || content.includes('isSubscriber') || content.match(/paywall|premium.*gate|subscribe.*wall/i)) {
        features.push({
          name: 'Paywall gate',
          type: 'paywall',
          location,
          hasE2ETests: false, // Will be updated later
        });
      }

      // Detect forms
      if (content.match(/<form|onSubmit|handleSubmit/)) {
        features.push({
          name: 'Form submission',
          type: 'form',
          location,
          hasE2ETests: false,
        });
      }

      // Detect modals
      if (content.match(/Modal|Dialog|isOpen.*Modal|show.*Modal/)) {
        features.push({
          name: 'Modal',
          type: 'modal',
          location,
          hasE2ETests: false,
        });
      }

      // Detect filters
      if (content.match(/filter.*state|activeFilters|clearFilters|onFilterChange/i)) {
        features.push({
          name: 'Filter system',
          type: 'filter',
          location,
          hasE2ETests: false,
        });
      }

      // Detect video player
      if (content.match(/MuxPlayer|VideoPlayer|playback.*url/i)) {
        features.push({
          name: 'Video player',
          type: 'video-player',
          location,
          hasE2ETests: false,
        });
      }

      // Detect uploads
      if (content.match(/file.*upload|upload.*button|type="file"/i)) {
        features.push({
          name: 'File upload',
          type: 'upload',
          location,
          hasE2ETests: false,
        });
      }

      // Detect downloads
      if (content.match(/download.*button|href.*download|download.*link/i)) {
        features.push({
          name: 'File download',
          type: 'download',
          location,
          hasE2ETests: false,
        });
      }
    }
  }

  return features;
}

/**
 * Gets test coverage from Jest
 */
async function getTestCoverage(): Promise<TestCoverage> {
  let coverage = 0;
  let total = 0;
  let passing = 0;

  try {
    // Run Jest with coverage
    const output = execSync('npm test -- --coverage --passWithNoTests --silent 2>&1', {
      encoding: 'utf-8',
      cwd: projectRoot,
    });

    // Parse test results
    const passMatch = output.match(/Tests:\s+(\d+) passed/);
    const totalMatch = output.match(/(\d+) total/);
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)/);

    if (passMatch) passing = parseInt(passMatch[1]);
    if (totalMatch) total = parseInt(totalMatch[1]);
    if (coverageMatch) coverage = parseFloat(coverageMatch[1]);
  } catch (error) {
    console.warn('⚠️  Could not run coverage report');
  }

  // Find integration and E2E tests
  const integrationFiles: string[] = [];
  const e2eFiles: string[] = [];

  async function findTestFiles(dir: string) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await findTestFiles(fullPath);
        } else if (entry.name.includes('.test.') || entry.name.includes('.spec.')) {
          const content = await readFile(fullPath, 'utf-8');
          const relativePath = relative(projectRoot, fullPath);

          if (content.includes('playwright') || content.includes('@playwright/test') || fullPath.includes('e2e')) {
            e2eFiles.push(relativePath);
          } else if (content.includes('integration') || fullPath.includes('integration')) {
            integrationFiles.push(relativePath);
          }
        }
      }
    } catch (error) {
      // Directory might not exist
    }
  }

  await findTestFiles(testsDir);

  return {
    unit: {
      total,
      passing,
      coverage,
    },
    integration: {
      total: integrationFiles.length,
      files: integrationFiles,
    },
    e2e: {
      total: e2eFiles.length,
      files: e2eFiles,
    },
  };
}

/**
 * Generates markdown report
 */
function generateMarkdownReport(routes: Route[], features: UXFeature[], coverage: TestCoverage): string {
  let md = '# 🏥 Developer Health Report\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += '---\n\n';

  // Test Coverage Summary
  md += '## 📊 Test Coverage Summary\n\n';
  md += `### Unit Tests\n`;
  md += `- **Total Tests**: ${coverage.unit.total}\n`;
  md += `- **Passing**: ${coverage.unit.passing}\n`;
  md += `- **Coverage**: ${coverage.unit.coverage.toFixed(2)}%\n\n`;

  md += `### Integration Tests\n`;
  md += `- **Total Files**: ${coverage.integration.total}\n`;
  if (coverage.integration.files.length > 0) {
    md += `- Files:\n`;
    for (const file of coverage.integration.files) {
      md += `  - \`${file}\`\n`;
    }
  }
  md += '\n';

  md += `### E2E Tests\n`;
  md += `- **Total Files**: ${coverage.e2e.total}\n`;
  if (coverage.e2e.files.length > 0) {
    md += `- Files:\n`;
    for (const file of coverage.e2e.files) {
      md += `  - \`${file}\`\n`;
    }
  } else {
    md += `- ⚠️ **No E2E tests found**\n`;
  }
  md += '\n';

  md += '---\n\n';

  // API Routes
  md += '## 🛣️  API Routes\n\n';
  md += '| Route | Methods | Auth | Tests | File |\n';
  md += '|-------|---------|------|----------|------|\n';

  for (const route of routes.sort((a, b) => a.path.localeCompare(b.path))) {
    const authBadge = getAuthBadge(route.authStatus);
    const testBadge = route.hasTests ? '✅' : '❌';
    const methods = route.methods.join(', ');

    md += `| \`${route.path}\` | ${methods} | ${authBadge} | ${testBadge} | \`${route.file}\` |\n`;
  }

  md += '\n';

  // Routes without tests
  const routesWithoutTests = routes.filter(r => !r.hasTests);
  if (routesWithoutTests.length > 0) {
    md += '### ⚠️  Routes Missing Tests\n\n';
    for (const route of routesWithoutTests) {
      md += `- \`${route.path}\` (${route.methods.join(', ')}) - ${route.authStatus}\n`;
    }
    md += '\n';
  }

  md += '---\n\n';

  // UX Features
  md += '## 🎨 UX Features\n\n';

  const featuresByType = new Map<string, UXFeature[]>();
  for (const feature of features) {
    if (!featuresByType.has(feature.type)) {
      featuresByType.set(feature.type, []);
    }
    featuresByType.get(feature.type)!.push(feature);
  }

  for (const [type, typeFeatures] of Array.from(featuresByType.entries()).sort()) {
    md += `### ${type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ')}\n\n`;
    md += `Found ${typeFeatures.length} instance(s):\n\n`;

    for (const feature of typeFeatures.slice(0, 10)) { // Limit to first 10
      const testBadge = feature.hasE2ETests ? '✅' : '❌';
      md += `- ${testBadge} \`${feature.location}\`\n`;
    }

    if (typeFeatures.length > 10) {
      md += `- ... and ${typeFeatures.length - 10} more\n`;
    }

    md += '\n';
  }

  // Features without E2E tests
  const featuresWithoutTests = features.filter(f => !f.hasE2ETests);
  if (featuresWithoutTests.length > 0) {
    md += '### ⚠️  Features Missing E2E Tests\n\n';
    md += `**Total**: ${featuresWithoutTests.length} features need E2E coverage\n\n`;
  }

  md += '---\n\n';

  // Recommendations
  md += '## 💡 Recommendations\n\n';

  if (coverage.unit.coverage < 80) {
    md += `- 🎯 **Improve unit test coverage** (currently ${coverage.unit.coverage.toFixed(2)}%, target: 80%)\n`;
  }

  if (coverage.e2e.total === 0) {
    md += `- 🎯 **Add E2E tests** (Playwright recommended)\n`;
  }

  if (routesWithoutTests.length > 0) {
    md += `- 🎯 **Add tests for ${routesWithoutTests.length} API route(s)**\n`;
  }

  if (featuresWithoutTests.length > 0) {
    md += `- 🎯 **Add E2E tests for ${featuresWithoutTests.length} UX feature(s)**\n`;
  }

  const publicRoutes = routes.filter(r => r.authStatus === 'public');
  if (publicRoutes.length > 5) {
    md += `- ⚠️ **Review ${publicRoutes.length} public route(s)** - ensure they should be public\n`;
  }

  return md;
}

function getAuthBadge(authStatus: Route['authStatus']): string {
  switch (authStatus) {
    case 'public':
      return '🌍 Public';
    case 'authenticated':
      return '🔒 Auth';
    case 'subscriber':
      return '💎 Subscriber';
    case 'coach':
      return '🎓 Coach';
    case 'owner':
      return '👑 Owner';
    default:
      return '❓ Unknown';
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🏥 Generating Developer Health Report...\n');

  console.log('📡 Discovering API routes...');
  const routes = await discoverRoutes();
  console.log(`   Found ${routes.length} route(s)\n`);

  console.log('🎨 Discovering UX features...');
  const features = await discoverUXFeatures();
  console.log(`   Found ${features.length} feature(s)\n`);

  console.log('📊 Analyzing test coverage...');
  const coverage = await getTestCoverage();
  console.log(`   Unit tests: ${coverage.unit.passing}/${coverage.unit.total} passing`);
  console.log(`   Coverage: ${coverage.unit.coverage.toFixed(2)}%`);
  console.log(`   Integration tests: ${coverage.integration.total}`);
  console.log(`   E2E tests: ${coverage.e2e.total}\n`);

  console.log('📝 Generating report...');
  const report = generateMarkdownReport(routes, features, coverage);

  // Write to file
  const { writeFileSync } = await import('fs');
  const reportPath = join(projectRoot, 'HEALTH_REPORT.md');
  writeFileSync(reportPath, report);

  console.log(`\n✅ Report generated: ${reportPath}`);
  console.log('\n' + '='.repeat(60));
  console.log(report);
}

if (require.main === module) {
  main().catch(console.error);
}
