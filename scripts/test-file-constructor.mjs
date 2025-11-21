#!/usr/bin/env node
/**
 * Test File() constructor approach directly to production sc2reader
 */

import { readFile } from 'fs/promises';

const REPLAY_PATH = process.env.HOME + "/Library/Application Support/Blizzard/StarCraft II/Accounts/766657/1-S2-1-802768/Replays/Multiplayer/Tokamak LE (31).SC2Replay";
const API_URL = "https://sc2-replay-analyzer-gold.vercel.app/fingerprint";
const API_KEY = "***REDACTED_API_KEY***";

console.log("Testing File() constructor approach...\n");

try {
  // Read the replay file
  const buffer = await readFile(REPLAY_PATH);

  // Approach 1: Convert to File (what our current code does)
  const file = new File([buffer], "Tokamak LE (31).SC2Replay", {
    type: 'application/octet-stream'
  });

  const formData = new FormData();
  formData.append('file', file);

  console.log("📤 Sending with File() constructor...");
  console.log(`   File name: ${file.name}`);
  console.log(`   File type: ${file.type}`);
  console.log(`   File size: ${file.size}`);

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
