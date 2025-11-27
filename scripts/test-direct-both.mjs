#!/usr/bin/env node
/**
 * Test direct Node.js → sc2reader (both local and production)
 * This bypasses Next.js entirely to isolate the issue
 */

import { readFile } from 'fs/promises';

const REPLAY_PATH = process.env.HOME + "/Library/Application Support/Blizzard/StarCraft II/Accounts/766657/1-S2-1-802768/Replays/Multiplayer/Tokamak LE (31).SC2Replay";
const API_KEY = process.env.SC2READER_API_KEY;

if (!API_KEY) {
  console.error("Error: SC2READER_API_KEY environment variable is required");
  process.exit(1);
}

async function testEndpoint(apiUrl, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${label}`);
  console.log(`URL: ${apiUrl}`);
  console.log('='.repeat(60));

  try {
    // Read the replay file
    const buffer = await readFile(REPLAY_PATH);
    console.log(`📁 Read replay file: ${buffer.length} bytes`);

    // Use native Node.js File() constructor
    const file = new File([buffer], "Tokamak LE (31).SC2Replay", {
      type: 'application/octet-stream'
    });
    console.log(`📦 Created File object: ${file.name} (${file.size} bytes, type: ${file.type})`);

    // Use native FormData
    const formData = new FormData();
    formData.append('file', file);
    console.log(`📤 Created FormData with file`);

    console.log(`\n🚀 Sending request...`);
    const startTime = Date.now();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
      },
      body: formData,
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Request took ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log(`\n✅ SUCCESS!`);
      console.log(`   Player: ${data.fingerprint?.player_name}`);
      console.log(`   Map: ${data.fingerprint?.metadata?.map}`);
      console.log(`   Race: ${data.fingerprint?.race}`);
      console.log(`   Matchup: ${data.fingerprint?.matchup}`);
      return true;
    } else {
      const text = await response.text();
      console.log(`\n❌ FAILED!`);
      console.log(`   Response body: ${text}`);
      return false;
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

async function main() {
  console.log('Direct Node.js → sc2reader Test');
  console.log('Testing both local and production endpoints');
  console.log('This bypasses Next.js to isolate the issue\n');

  // Test local sc2reader
  const localResult = await testEndpoint(
    'http://localhost:8000/fingerprint',
    'Local sc2reader (localhost:8000)'
  );

  // Test production sc2reader
  const prodResult = await testEndpoint(
    'https://sc2-replay-analyzer-gold.vercel.app/fingerprint',
    'Production sc2reader (Vercel)'
  );

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Local sc2reader:      ${localResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Production sc2reader: ${prodResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(60));

  if (localResult && !prodResult) {
    console.log('\n🔍 DIAGNOSIS: Local works but production fails');
    console.log('   This suggests a difference between local and production sc2reader deployments.');
    console.log('   The issue is NOT with Node.js FormData encoding.');
  } else if (!localResult && !prodResult) {
    console.log('\n🔍 DIAGNOSIS: Both local and production fail');
    console.log('   This suggests an issue with the request format itself.');
  } else if (localResult && prodResult) {
    console.log('\n🔍 DIAGNOSIS: Both work!');
    console.log('   The issue must be specific to Next.js request forwarding.');
  }

  process.exit(localResult && prodResult ? 0 : 1);
}

main();
