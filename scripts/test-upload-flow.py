#!/usr/bin/env python3
"""
Unified test script for replay upload flow
Tests all three scenarios:
  1. Local API → Local sc2reader
  2. Local API → Production sc2reader
  3. Production API → Production sc2reader

Usage:
  python scripts/test-upload-flow.py 1  # Test step 1
  python scripts/test-upload-flow.py 2  # Test step 2
  python scripts/test-upload-flow.py 3  # Test step 3
  python scripts/test-upload-flow.py all  # Test all steps
"""

import jwt
import requests
import sys
import os
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

# Load environment files
env_local_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_local_path)

# Configuration
LOCAL_NEXT_API = 'http://localhost:3000'
PROD_NEXT_API = 'https://www.ladderlegendsacademy.com'
LOCAL_SC2READER = 'http://localhost:8000'
PROD_SC2READER = 'https://sc2-replay-analyzer-gold.vercel.app/'

# Secrets from .env.local
AUTH_SECRET = os.getenv('AUTH_SECRET')
SC2READER_API_KEY = os.getenv('SC2READER_API_KEY')
USER_ID = os.getenv('TEST_USER_ID', '161384451518103552')
ROLE_ID = os.getenv('TEST_ROLE_ID', '1386739785283928124')

# Default replay file
DEFAULT_REPLAY = os.path.expanduser(
    "~/Library/Application Support/Blizzard/StarCraft II/Accounts/766657/"
    "1-S2-1-802768/Replays/Multiplayer/Tokamak LE (31).SC2Replay"
)

# Test scenarios
TESTS = {
    '1': {
        'name': 'Step 1: Local API → Local sc2reader',
        'api_url': LOCAL_NEXT_API,
        'sc2reader_url': LOCAL_SC2READER,
        'requires': ['next:3000', 'sc2reader:8000'],
    },
    '2': {
        'name': 'Step 2: Local API → Production sc2reader',
        'api_url': LOCAL_NEXT_API,
        'sc2reader_url': PROD_SC2READER,
        'requires': ['next:3000'],
    },
    '3': {
        'name': 'Step 3: Production API → Production sc2reader',
        'api_url': PROD_NEXT_API,
        'sc2reader_url': PROD_SC2READER,
        'requires': [],
    },
}

def check_process_running(port):
    """Check if a process is running on the given port"""
    try:
        result = subprocess.run(
            ['lsof', '-ti', f':{port}'],
            capture_output=True,
            text=True
        )
        return result.returncode == 0
    except Exception:
        return False

def check_requirements(test_config):
    """Check if required processes are running"""
    missing = []
    for req in test_config['requires']:
        service, port = req.split(':')
        if not check_process_running(port):
            missing.append(req)

    if missing:
        print(f"❌ Missing required services: {', '.join(missing)}")
        print()
        for req in missing:
            service, port = req.split(':')
            if service == 'next':
                print(f"  Start Next.js with:")
                print(f"    env SC2READER_API_URL=\"{test_config['sc2reader_url']}\" \\")
                print(f"        SC2READER_API_KEY=\"{SC2READER_API_KEY}\" \\")
                print(f"        npm run dev")
            elif service == 'sc2reader':
                print(f"  Start sc2reader with:")
                print(f"    cd /Users/chadfurman/projects/sc2reader && \\")
                print(f"    source venv/bin/activate && \\")
                print(f"    python -m uvicorn api.index:app --reload --port 8000")
        print()
        return False
    return True

def generate_token():
    """Generate JWT token for authentication"""
    if not AUTH_SECRET:
        print("❌ Error: AUTH_SECRET not found in .env.local")
        sys.exit(1)

    # Python dotenv doesn't process escape sequences like Next.js does
    auth_secret = AUTH_SECRET.replace('\\$', '$')

    payload = {
        'userId': USER_ID,
        'type': 'uploader',
        'roles': [ROLE_ID],
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, auth_secret, algorithm='HS256')

def test_upload(test_config, replay_path):
    """Test replay upload"""
    print(f"{'=' * 60}")
    print(test_config['name'])
    print(f"{'=' * 60}")
    print(f"📤 API: {test_config['api_url']}")
    print(f"🔧 sc2reader: {test_config['sc2reader_url']}")
    print(f"📁 File: {replay_path}")
    print()

    if not check_requirements(test_config):
        return False

    if not os.path.exists(replay_path):
        print(f"❌ Error: Replay file not found: {replay_path}")
        return False

    token = generate_token()
    print(f"🔑 Generated JWT token")

    with open(replay_path, 'rb') as f:
        files = {'file': (os.path.basename(replay_path), f, 'application/octet-stream')}
        headers = {'Authorization': f'Bearer {token}'}

        try:
            print(f"🚀 Uploading...")
            response = requests.post(
                f'{test_config["api_url"]}/api/my-replays',
                files=files,
                headers=headers,
                timeout=60
            )

            print(f"📊 Status: {response.status_code}")

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
                    print()
                    return True
                else:
                    print(f"❌ FAILED: {data}")
                    print()
                    return False
            else:
                print(f"❌ FAILED: HTTP {response.status_code}")
                try:
                    error = response.json()
                    print(f"   Error: {error}")
                except:
                    print(f"   Response: {response.text[:200]}")
                print()
                return False

        except requests.exceptions.Timeout:
            print(f"❌ FAILED: Request timed out after 60s")
            print()
            return False
        except requests.exceptions.ConnectionError:
            print(f"❌ FAILED: Could not connect to {test_config['api_url']}")
            print(f"   Make sure the API server is running")
            print()
            return False
        except Exception as e:
            print(f"❌ FAILED: {e}")
            print()
            return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/test-upload-flow.py <step>")
        print("  step: 1, 2, 3, or 'all'")
        print()
        print("Steps:")
        for key, config in TESTS.items():
            print(f"  {key}: {config['name']}")
        sys.exit(1)

    step = sys.argv[1]
    replay_path = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_REPLAY

    if step == 'all':
        results = {}
        for key in sorted(TESTS.keys()):
            results[key] = test_upload(TESTS[key], replay_path)

        print(f"{'=' * 60}")
        print("SUMMARY")
        print(f"{'=' * 60}")
        for key, passed in results.items():
            status = '✅ PASS' if passed else '❌ FAIL'
            print(f"{TESTS[key]['name']}: {status}")
        print(f"{'=' * 60}")

        sys.exit(0 if all(results.values()) else 1)

    elif step in TESTS:
        success = test_upload(TESTS[step], replay_path)
        sys.exit(0 if success else 1)

    else:
        print(f"❌ Invalid step: {step}")
        print("   Valid steps: 1, 2, 3, all")
        sys.exit(1)

if __name__ == '__main__':
    main()
