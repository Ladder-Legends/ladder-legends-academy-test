# Testing Guide - Discord Role-Based Access

## Prerequisites

- You have admin access to the Ladder Legends Academy Discord server (ID: 1386735340517195959)
- You have a test user account on Discord (or can use your main account for testing)

## Step 1: Invite the Bot to Your Server

1. Open this URL in your browser:
   ```
   https://discord.com/api/oauth2/authorize?client_id=1429494465898348737&permissions=2147485696&scope=bot%20applications.commands
   ```

2. Select **Ladder Legends Academy** server from the dropdown
3. Click **Authorize**
4. Complete the CAPTCHA if prompted

**Permissions the bot needs:**
- View Channels
- Send Messages
- Use Slash Commands

## Step 2: Deploy Slash Commands (One-time)

After inviting the bot, deploy the slash commands:

```bash
cd /Users/chadfurman/projects/ladder-legends-bot
npm run deploy-commands
```

You should see: "Successfully reloaded 4 application (/) commands."

## Step 3: Start the Discord Bot Locally

In the bot directory:

```bash
cd /Users/chadfurman/projects/ladder-legends-bot
npm run dev
```

Keep this running in the background. You should see:
```
✓ Logged in as [Bot Name]
```

## Step 4: Configure Role for Testing

On Discord:

1. Go to your **Ladder Legends Academy** server
2. Create a test role or use one of the existing allowed roles:
   - **Owner** (ID: 1386739785283928124)
   - **Moderator** (ID: 1386739850731851817)
   - **Coach** (ID: 1387372036665643188)
   - **Subscriber** (ID: 1387076312878813337)
   - **Member** (ID: 1386740453264724068)

3. Assign yourself (or test user) one of these roles

## Step 5: Test Website Access WITH Role

1. Make sure the website is running:
   ```bash
   cd /Users/chadfurman/projects/ladder-legends-academy
   npm run dev
   ```

2. Open http://localhost:3000 in your browser
3. You should be redirected to `/login`
4. Click **Sign in with Discord**
5. Authorize the application if prompted
6. **Expected Result:** You should be redirected to the home page and see the video library

## Step 6: Test Role Removal

While logged in:

1. On Discord, **remove the role** from your user
2. On the website, **refresh the page** (F5 or Cmd+R)
3. **Expected Result:** You should be redirected to `/login` with an error message:
   ```
   You need one of the following roles in the Ladder Legends Academy Discord server:
   Owner, Moderator, Coach, Subscriber, or Member.
   ```

## Step 7: Test Access WITHOUT Role

1. Log out of the website (use the user menu in the top-right)
2. Make sure you **don't have any of the allowed roles** on Discord
3. Try to sign in again
4. **Expected Result:** You should see the login page with the error message

## Step 8: Re-add Role and Test Again

1. On Discord, **add the role back** to your user
2. On the website, click **Sign in with Discord** again
3. **Expected Result:** You should successfully access the home page

## Troubleshooting

### "Missing Access" error when deploying commands
- Make sure the bot has been invited to the server first
- Check that the bot has "applications.commands" scope

### Bot not responding
- Check that `npm run dev` is still running in the bot directory
- Check the console for any error messages

### Role check not working
- Verify `SKIP_ROLE_CHECK=false` in `.env.local`
- Check that the bot token is correct in both `.env` files
- Verify the bot is in the server and online
- Check that the role IDs are correct

### Still getting access without role
- Clear your browser cookies/session
- Sign out and sign in again
- Check that you've restarted the Next.js dev server after changing `.env.local`

## Current Configuration

**Allowed Roles:**
- Owner: 1386739785283928124
- Moderator: 1386739850731851817
- Coach: 1387372036665643188
- Subscriber: 1387076312878813337
- Member: 1386740453264724068

**Server ID:** 1386735340517195959
**Application ID:** 1429494465898348737

## Testing the Bot Commands (Optional)

Once the bot is running, you can test the slash commands:

1. In any Discord channel, type `/add-video`
2. Fill in the parameters
3. The bot should respond and commit the video to GitHub
4. Vercel should automatically deploy the updated site

**Note:** Only users with Owner, Moderator, or Coach roles can use bot commands.
