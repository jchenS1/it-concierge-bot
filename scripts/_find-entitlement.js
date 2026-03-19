require('dotenv').config();
const { C1_CLIENT_ID, C1_CLIENT_SECRET, C1_TENANT_DOMAIN } = process.env;
const APP_ID = '2CAfu61AAA3heEItnkkKHsLdSak';
const SEARCH = (process.argv[2] || 'team-it').toLowerCase();

(async () => {
  const t = await fetch(`https://${C1_TENANT_DOMAIN}/auth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: C1_CLIENT_ID, client_secret: C1_CLIENT_SECRET }),
  });
  const { access_token } = await t.json();

  let all = [], pt = '', page = 0;
  do {
    const url = `https://${C1_TENANT_DOMAIN}/api/v1/apps/${APP_ID}/entitlements?pageSize=250${pt ? '&pageToken=' + pt : ''}`;
    const data = await (await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } })).json();
    all = all.concat((data.list || []).map(e => e.appEntitlement).filter(Boolean));
    pt = data.nextPageToken || '';
    page++;
  } while (pt);

  console.log(`\nTotal entitlements across ${page} page(s): ${all.length}`);
  const hits = all.filter(e => (e.displayName || '').toLowerCase().includes(SEARCH));
  console.log(`Matches for "${SEARCH}": ${hits.length}\n`);

  if (hits.length) {
    hits.forEach(e => {
      console.log(`  displayName    : ${e.displayName}`);
      console.log(`  app_id         : ${e.appId}`);
      console.log(`  entitlement_id : ${e.id}`);
      console.log('');
    });
  } else {
    console.log('No exact match. Closest (contains "team"):');
    all.filter(e => (e.displayName || '').toLowerCase().includes('team'))
      .slice(0, 20)
      .forEach(e => console.log(`  ${(e.displayName || '').padEnd(55)} ${e.id}`));
  }
})().catch(e => { console.error(e.message); process.exit(1); });
