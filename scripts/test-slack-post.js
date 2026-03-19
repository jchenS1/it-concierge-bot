#!/usr/bin/env node
/**
 * test-slack-post.js
 * Posts a test message to #it-pilot to verify SLACK_BOT_TOKEN and permissions.
 *
 * Usage: node scripts/test-slack-post.js
 * Requires: SLACK_BOT_TOKEN in .env
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const token = process.env.SLACK_BOT_TOKEN;
if (!token || token === 'xoxb-...') {
  console.error('ERROR: SLACK_BOT_TOKEN is not set in .env');
  process.exit(1);
}

const CHANNEL = '#it-pilot';

async function main() {
  console.log(`\nTesting Slack bot token against channel: ${CHANNEL}\n`);

  console.log('Step 1: Verifying token via auth.test...');
  const authRes = await fetch('https://slack.com/api/auth.test', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const auth = await authRes.json();

  if (!auth.ok) {
    console.error(`  FAILED: ${auth.error}`);
    console.error('  Check that SLACK_BOT_TOKEN is correct and the app is installed to your workspace.');
    process.exit(1);
  }

  console.log(`  OK — bot user : @${auth.user}`);
  console.log(`  OK — workspace : ${auth.team}`);
  console.log(`  OK — bot id   : ${auth.bot_id}`);

  console.log(`\nStep 2: Posting test message to ${CHANNEL}...`);
  const postRes = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: CHANNEL,
      text: '✅ IT Concierge Bot connected. Slack credentials verified.',
      unfurl_links: false,
    }),
  });
  const post = await postRes.json();

  if (!post.ok) {
    console.error(`  FAILED: ${post.error}`);
    if (post.error === 'channel_not_found') {
      console.error(`  Make sure #it-pilot exists and the bot has been invited: /invite @${auth.user}`);
    }
    if (post.error === 'not_in_channel') {
      console.error(`  Bot is not in the channel. Run: /invite @${auth.user} in #it-pilot`);
    }
    process.exit(1);
  }

  console.log(`  OK — message posted (ts: ${post.ts})`);
  console.log('\nSlack credentials verified. Bot is live in #it-pilot.\n');
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
