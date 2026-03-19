#!/usr/bin/env node
/**
 * find-user.js
 * Tests different C1 API approaches to look up a user by email.
 * Usage: node scripts/find-user.js jack.chen@system1.com
 */
try {
  const fs = require('fs'), path = require('path');
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim();
      if (!(k in process.env)) process.env[k] = v;
    }
  }
} catch {}

const { C1_CLIENT_ID, C1_CLIENT_SECRET, C1_TENANT_DOMAIN } = process.env;
const BASE = `https://${C1_TENANT_DOMAIN}`;
const email = process.argv[2];

if (!email) { console.error('Usage: node find-user.js <email>'); process.exit(1); }

async function getToken() {
  const res = await fetch(`${BASE}/auth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: C1_CLIENT_ID, client_secret: C1_CLIENT_SECRET }).toString(),
  });
  return (await res.json()).access_token;
}

async function tryEndpoint(token, label, url, opts = {}) {
  console.log(`\n--- ${label} ---`);
  console.log(`GET ${url}`);
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...opts });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    const data = JSON.parse(text);
    // Show first user email if list present
    const list = data.list || data.users || data.results || [];
    if (list.length > 0) {
      const u = list[0].user || list[0];
      console.log(`First result: ${u.displayName} <${u.email}> (id: ${u.id})`);
      console.log(`Total results: ${list.length}`);
    } else {
      console.log('Result:', JSON.stringify(data).slice(0, 300));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

async function main() {
  console.log(`Looking up: ${email}\n`);
  const token = await getToken();

  const enc = encodeURIComponent(email);

  // Try various filter/search approaches
  await tryEndpoint(token, 'filter[email]', `${BASE}/api/v1/users?filter[email]=${enc}&pageSize=5`);
  await tryEndpoint(token, 'email= (no brackets)', `${BASE}/api/v1/users?email=${enc}&pageSize=5`);
  await tryEndpoint(token, 'search query param', `${BASE}/api/v1/users?search=${enc}&pageSize=5`);
  await tryEndpoint(token, 'q param', `${BASE}/api/v1/users?q=${enc}&pageSize=5`);
  await tryEndpoint(token, 'POST search', `${BASE}/api/v1/users/search`, {
    method: 'POST',
    body: JSON.stringify({ query: email, pageSize: 5 }),
  });
  await tryEndpoint(token, 'POST search with email field', `${BASE}/api/v1/users/search`, {
    method: 'POST',
    body: JSON.stringify({ email, pageSize: 5 }),
  });
}

main();
