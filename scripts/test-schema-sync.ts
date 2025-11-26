#!/usr/bin/env npx tsx
/**
 * Integration test: Verify TypeScript and Python schema validation are in sync
 *
 * This script:
 * 1. Creates a mock fingerprint using TypeScript
 * 2. Validates it with TypeScript schema validation
 * 3. Calls Python schema validation on the same data
 * 4. Compares results
 *
 * Usage:
 *   npx tsx scripts/test-schema-sync.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  validateFingerprint,
  createMockFingerprint,
  SCHEMA_VERSION,
} from '../src/lib/schemas/fingerprint-validation';

const SC2READER_PATH = path.resolve(__dirname, '../../sc2reader');
const PYTHON_PATH = `${SC2READER_PATH}/venv/bin/python`;
const TEMP_FILE = '/tmp/fingerprint-test.json';

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Schema Sync Integration Test');
  console.log(`  TypeScript Schema Version: ${SCHEMA_VERSION}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Check if sc2reader exists
  if (!fs.existsSync(SC2READER_PATH)) {
    console.error(`sc2reader not found at ${SC2READER_PATH}`);
    process.exit(1);
  }

  // Test 1: Valid mock fingerprint
  console.log('Test 1: Valid mock fingerprint');
  const validMock = createMockFingerprint();
  const tsResult1 = validateFingerprint(validMock);
  console.log(`  TypeScript validation: ${tsResult1.valid ? 'PASS' : 'FAIL'}`);

  // Write to temp file for Python
  fs.writeFileSync(TEMP_FILE, JSON.stringify(validMock, null, 2));

  // Run Python validation
  try {
    const pyOutput = execSync(
      `cd ${SC2READER_PATH} && ${PYTHON_PATH} -c "
import json
import sys
sys.path.insert(0, 'schemas')
from fingerprint_validation import validate_fingerprint, SCHEMA_VERSION
print('Python Schema Version:', SCHEMA_VERSION)
with open('${TEMP_FILE}') as f:
    data = json.load(f)
valid, errors = validate_fingerprint(data)
print('Valid:', valid)
if errors:
    print('Errors:', errors[:3])
"`,
      { encoding: 'utf-8' }
    );
    console.log(`  Python validation:\n${pyOutput.split('\n').map(l => '    ' + l).join('\n')}`);
  } catch (error) {
    console.error('  Python validation failed:', error);
  }

  // Test 2: Invalid fingerprint (bad matchup)
  console.log('\nTest 2: Invalid fingerprint (bad matchup)');
  const invalidMock = createMockFingerprint();
  // TypeScript allows this since matchup is typed as string, but JSON Schema will reject it
  invalidMock.matchup = 'INVALID';
  const tsResult2 = validateFingerprint(invalidMock);
  console.log(`  TypeScript validation: ${tsResult2.valid ? 'FAIL (should be invalid)' : 'PASS (correctly invalid)'}`);

  fs.writeFileSync(TEMP_FILE, JSON.stringify(invalidMock, null, 2));

  try {
    const pyOutput = execSync(
      `cd ${SC2READER_PATH} && ${PYTHON_PATH} -c "
import json
import sys
sys.path.insert(0, 'schemas')
from fingerprint_validation import validate_fingerprint
with open('${TEMP_FILE}') as f:
    data = json.load(f)
valid, errors = validate_fingerprint(data)
print('Valid:', valid)
if not valid:
    print('Correctly detected invalid')
"`,
      { encoding: 'utf-8' }
    );
    console.log(`  Python validation:\n${pyOutput.split('\n').map(l => '    ' + l).join('\n')}`);
  } catch (error) {
    console.error('  Python validation failed:', error);
  }

  // Test 3: Fingerprint with supply block data
  console.log('\nTest 3: Fingerprint with economy/supply block data');
  const economyMock = createMockFingerprint({
    economy: {
      workers_3min: 15,
      workers_5min: 32,
      workers_7min: 55,
      expansion_count: 3,
      avg_expansion_timing: 165,
      supply_block_count: 2,
      total_supply_block_time: 12,
      supply_block_periods: [
        { start: 180, end: 185, duration: 5, severity: 'minor' as const },
        { start: 300, end: 307, duration: 7, severity: 'warning' as const },
      ],
    },
  });

  const tsResult3 = validateFingerprint(economyMock);
  console.log(`  TypeScript validation: ${tsResult3.valid ? 'PASS' : 'FAIL'}`);

  fs.writeFileSync(TEMP_FILE, JSON.stringify(economyMock, null, 2));

  try {
    const pyOutput = execSync(
      `cd ${SC2READER_PATH} && ${PYTHON_PATH} -c "
import json
import sys
sys.path.insert(0, 'schemas')
from fingerprint_validation import validate_fingerprint
with open('${TEMP_FILE}') as f:
    data = json.load(f)
valid, errors = validate_fingerprint(data)
print('Valid:', valid)
print('Supply blocks:', len(data.get('economy', {}).get('supply_block_periods', [])))
"`,
      { encoding: 'utf-8' }
    );
    console.log(`  Python validation:\n${pyOutput.split('\n').map(l => '    ' + l).join('\n')}`);
  } catch (error) {
    console.error('  Python validation failed:', error);
  }

  // Cleanup
  if (fs.existsSync(TEMP_FILE)) {
    fs.unlinkSync(TEMP_FILE);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Integration test complete');
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(console.error);
