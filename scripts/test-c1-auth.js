#!/usr/bin/env node
/**
 * test-c1-auth.js
 * Verifies ConductorOne API credentials by fetching an OAuth2 token
 * and making a test API call.
 *
 * Usage:
 *   cp .env.example .env       # fill in C1_CLIENT_ID, C1_CLIENT_SECRET, C1_TENANT_DOMAIN
 *   node scripts/test-c1-auth.js
 */

// Load .env if present (no hard dependency on dotenv — falls back to process.env)
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = val;
    }
    console.log('Loaded .env file');
  }
} catch (e) {
  // ignore — rely on process.env
}

const { C1_CLIENT_ID, C1_CLIENT_SECRET, C1_TENANT_DOMAIN } = process.env;

if (!C1_CLIENT_ID || !C1_CLIENT_SECRET || !C1_TENANT_DOMAIN) {
  console.error('Missing required env vars: C1_CLIENT_ID, C1_CLIENT_SECRET, C1_TENANT_DOMAIN');
  console.error('Copy .env.example to .env and fill in your credentials.');
  process.exit(1);
}

const BASE_URL = `https://${C1_TENANT_DOMAIN}`;

async function fetchToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: C1_CLIENT_ID,
    client_secret: C1_CLIENT_SECRET,
  });

  const res = await fetch(`${BASE_URL}/auth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Token request failed (${res.status}): ${text}`);
  }

  const data = JSON.parse(text);
  return data;
}

async function testApiCall(token) {
  // Hit the users list endpoint — a lightweight read that confirms the token works
  const res = await fetch(`${BASE_URL}/api/v1/users?pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`API call failed (${res.status}): ${text}`);
  }

  return JSON.parse(text);
}

async function main() {
  console.log(`\nTesting ConductorOne credentials against: ${BASE_URL}\n`);

  // Step 1: Get token
  process.stdout.write('Step 1: Fetching OAuth2 token... ');
  let tokenData;
  try {
    tokenData = await fetchToken();
  } catch (err) {
    console.error('FAILED');
    console.error(`  ${err.message}`);
    process.exit(1);
  }

  const { access_token, token_type, expires_in } = tokenData;
  console.log(`OK`);
  console.log(`  Token type : ${token_type}`);
  console.log(`  Expires in : ${expires_in}s`);

  // Step 2: Test an authenticated API call
  process.stdout.write('\nStep 2: Testing API call (GET /api/v1/users)... ');
  try {
    await testApiCall(access_token);
  } catch (err) {
    console.error('FAILED');
    console.error(`  ${err.message}`);
    process.exit(1);
  }
  console.log('OK');

  console.log('\nC1 credentials verified. Ready to build.\n');
}

main();
