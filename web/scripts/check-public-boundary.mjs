import assert from 'node:assert/strict';
const base=process.env.TEST_URL || 'http://127.0.0.1:3017';
let checks=0;
async function check(path,options,test) {
  const response=await fetch(new URL(path,base),{redirect:'manual',...options});
  await test(response); checks++;
}
await check('/',{},r=>{assert.equal(r.status,307);assert.equal(new URL(r.headers.get('location'),base).pathname,'/login');});
await check('/login',{},async r=>{assert.equal(r.status,200);assert.match(await r.text(),/Stronger/);});
for (const path of ['/api/data','/api/export','/api/media?key=00000000-0000-0000-0000-000000000000']) {
  await check(path,{},async r=>{assert.equal(r.status,401);assert.match(r.headers.get('cache-control'),/no-store/);assert.match((await r.json()).error,/Sign in/);});
}
await check('/api/data',{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'attacker@example.com'}},r=>assert.equal(r.status,401));
for (const path of ['/api/data','/api/auth/logout']) {
  await check(path,{method:'POST',headers:{Origin:'https://unrelated.example','Sec-Fetch-Site':'cross-site','Content-Type':'application/json'},body:'{}'},r=>assert.equal(r.status,403));
}
await check('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},async r=>{assert.equal(r.status,401);const text=await r.text();assert.ok(!text.includes('SUPABASE_'));assert.ok(!text.includes('access_token'));});
await check('/manifest.webmanifest',{},async r=>{assert.equal(r.status,200);const manifest=await r.json();assert.equal(manifest.start_url,'/');assert.ok(manifest.icons.length>=2);});
console.log(`${checks} public access boundary checks passed. Hosted user/database tests are separate.`);
