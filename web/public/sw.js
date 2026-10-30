self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
// Keep personal fitness records online and uncached. Local draft recovery lives
// in the app; no API response or private photo is stored by this worker.
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0B0F0E"><title>Thortitas Fit Data</title><body style="background:#0B0F0E;color:white;font:18px system-ui;display:grid;place-items:center;min-height:90vh;margin:20px"><main style="max-width:400px"><p style="color:#B4FF39">THORTITAS FIT DATA</p><h1>You’re offline.</h1><p>Connect to the internet to access your private training space. Your saved workouts are safely stored online.</p><button onclick="location.reload()" style="background:#B4FF39;border:0;border-radius:12px;padding:14px 24px;font:inherit">Try again</button></main></body></html>', {status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
