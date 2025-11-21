# Testing Scripts

Automated testing scripts for replay upload functionality.

## Prerequisites

**Node.js Scripts:**
```bash
npm install jsonwebtoken dotenv
```

**Python Scripts:**
```bash
pip3 install --break-system-packages pyjwt requests python-dotenv
```

## Environment Configuration

Scripts read from `.env.local` and `.env.production.local`:

- `AUTH_SECRET`: JWT signing secret
- `SC2READER_API_KEY`: API key for sc2reader service
- `TEST_USER_ID` (optional): Override test user ID
- `TEST_ROLE_ID` (optional): Override test role ID

## Usage

**Generate JWT tokens:**
```bash
node scripts/generate-token.mjs local   # or 'prod'
```

**Test replay uploads:**
```bash
python3 scripts/step1-local-api-local-sc2reader.py
python3 scripts/step2-local-api-prod-sc2reader.py  
python3 scripts/step3-prod-api-prod-sc2reader.py
```

All scripts exit with 0 on success, 1 on failure.
