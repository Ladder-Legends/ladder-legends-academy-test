#!/usr/bin/env node
/**
 * Test Blob+filename approach directly to production sc2reader
 */

import { readFile } from 'fs/promises';

const REPLAY_PATH = process.env.HOME + "/Library/Application Support/Blizzard/StarCraft II/Accounts/766657/1-S2-1-802768/Replays/Multiplayer/Tokamak LE (31).SC2Replay";
const API_URL = "https://sc2-replay-analyzer-gold.vercel.app/fingerprint";
const API_KEY = "***REDACTED_API_KEY***";

console.log("Testing Blob+filename approach...\n");

try {
  // Read the replay file
  const buffer = await readFile(REPLAY_PATH);

  // Approach 2: Use Blob directly with filename parameter
  const blob = new Blob([buffer], { type: 'application/octet-stream' });

  const formData = new FormData();
  formData.append('file', blob, "Tokamak LE (31).SC2Replay");

  console.log("📤 Sending with Blob+filename...");
  console.log(`   Blob type: ${blob.type}`);
  console.log(`   Blob size: ${blob.size}`);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
    },
    body: formData,
  });

  console.log(`\n✅ Status: ${response.status}`);

  if (response.ok) {
    const data = await response.json();
    console.log(`✅ SUCCESS!`);
    console.log(`   Player: ${data.fingerprint?.player_name}`);
    console.log(`   Map: ${data.fingerprint?.metadata?.map}`);
  } else {
    const text = await response.text();
    console.log(`❌ FAILED: ${text}`);
  }
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
