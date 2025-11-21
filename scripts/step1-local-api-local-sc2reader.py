#!/usr/bin/env python3
"""
Step 1: Test localhost Next.js API → localhost Python sc2reader
Tests the File() constructor fix with both services running locally.

Requires .env.local to be present with AUTH_SECRET and SC2READER_API_KEY
"""

import jwt
import requests
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

# Load .env.local file
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

# Configuration from environment
LOCAL_JWT_SECRET = os.getenv('AUTH_SECRET')
SC2READER_API_KEY = os.getenv('SC2READER_API_KEY')
USER_ID = os.getenv('TEST_USER_ID', '161384451518103552')
ROLE_ID = os.getenv('TEST_ROLE_ID', '1386739785283928124')

if not LOCAL_JWT_SECRET:
    print("❌ Error: AUTH_SECRET not found in .env.local")
    sys.exit(1)

if not SC2READER_API_KEY:
    print("❌ Error: SC2READER_API_KEY not found in .env.local")
    sys.exit(1)

NEXT_API_URL = 'http://localhost:3000'
SC2READER_API_URL = 'http://localhost:8000'

# Default replay file path
DEFAULT_REPLAY = os.path.expanduser(
    "~/Library/Application Support/Blizzard/StarCraft II/Accounts/766657/"
    "1-S2-1-802768/Replays/Multiplayer/Tokamak LE (31).SC2Replay"
)

def generate_token():
    """Generate JWT token for local environment"""
    payload = {
        'userId': USER_ID,
        'type': 'uploader',
        'roles': [ROLE_ID],
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    token = jwt.encode(payload, LOCAL_JWT_SECRET, algorithm='HS256')
    return token

def upload_replay(replay_path):
    """Upload replay file to API"""
    token = generate_token()

    print(f"🔑 Generated local JWT token")
    print(f"📤 Testing upload to {NEXT_API_URL}/api/my-replays")
    print(f"📊 Using sc2reader at {SC2READER_API_URL}")
    print(f"📁 File: {replay_path}")
    print()

    if not os.path.exists(replay_path):
        print(f"❌ Error: Replay file not found: {replay_path}")
        return False

    with open(replay_path, 'rb') as f:
        files = {'file': (os.path.basename(replay_path), f, 'application/octet-stream')}
        headers = {'Authorization': f'Bearer {token}'}

        try:
            response = requests.post(
                f'{NEXT_API_URL}/api/my-replays',
                files=files,
                headers=headers,
                timeout=60
            )

            print(f"Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print("✅ SUCCESS! Replay uploaded and analyzed")
                    print(f"   Replay ID: {data['replay']['id']}")
                    if data['replay'].get('fingerprint'):
                        fp = data['replay']['fingerprint']
                        print(f"   Matchup: {fp.get('matchup')}")
                        print(f"   Race: {fp.get('race')}")
                        print(f"   Player: {fp.get('player_name')}")
                        print(f"   Map: {fp.get('metadata', {}).get('map')}")
                    return True
                else:
                    print(f"❌ FAILED: {data}")
                    return False
            else:
                print(f"❌ FAILED: HTTP {response.status_code}")
                try:
                    print(f"   Error: {response.json()}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False

        except requests.exceptions.ConnectionError as e:
            print(f"❌ Connection Error: Could not connect to {NEXT_API_URL}")
            print(f"   Make sure Next.js dev server is running with:")
            print(f"   SC2READER_API_URL='{SC2READER_API_URL}' SC2READER_API_KEY='{SC2READER_API_KEY}' npm run dev")
            return False
        except Exception as e:
            print(f"❌ Error: {e}")
            return False

if __name__ == '__main__':
    print("=" * 60)
    print("STEP 1: Local Next.js API → Local sc2reader")
    print("=" * 60)
    print()

    replay_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_REPLAY

    success = upload_replay(replay_path)
    sys.exit(0 if success else 1)
