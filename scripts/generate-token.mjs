#!/usr/bin/env node
/**
 * Generate JWT tokens for testing replay uploads
 * Usage: node scripts/generate-token.mjs [local|prod]
 *
 * Requires AUTH_SECRET to be set in .env.local (for local) or .env.production.local (for prod)
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Get environment from command line (default: local)
const env = process.argv[2] || 'local';

if (!['local', 'prod'].includes(env)) {
  console.error('Error: Environment must be "local" or "prod"');
  process.exit(1);
}

// Load appropriate .env file
const envFile = env === 'local' ? '.env.local' : '.env.production.local';
const envPath = resolve(__dirname, '..', envFile);
dotenv.config({ path: envPath });

const secret = process.env.AUTH_SECRET;
if (!secret) {
  console.error(`Error: AUTH_SECRET not found in ${envFile}`);
  console.error(`Expected file: ${envPath}`);
  process.exit(1);
}

// These can be customized via environment variables if needed
const USER_ID = process.env.TEST_USER_ID || '161384451518103552';
const ROLE_ID = process.env.TEST_ROLE_ID || '1386739785283928124';

// Generate token
const token = jwt.sign(
  {
    userId: USER_ID,
    type: 'uploader',
    roles: [ROLE_ID]
  },
  secret,
  { expiresIn: '1h' }
);

console.log(`\n✅ Generated ${env} token (expires in 1 hour):\n`);
console.log(token);
console.log('\n📋 Copy this command to test:\n');

if (env === 'local') {
  console.log(`TOKEN='${token}'`);
  console.log(`curl -X POST http://localhost:3000/api/my-replays -H "Authorization: Bearer $TOKEN" -F file=@/tmp/test.SC2Replay\n`);
} else {
  console.log(`TOKEN='${token}'`);
  console.log(`curl -X POST https://www.ladderlegendsacademy.com/api/my-replays -H "Authorization: Bearer $TOKEN" -F file=@/tmp/test.SC2Replay\n`);
}
