/* Stepping Stone — service worker for offline/repeat-load speed.
   Strategy (safe for frequent GitHub→Vercel deploys):
   - App shell (index.html / navigations): NETWORK-FIRST → a new deploy always lands when online;
     falls back to the cached shell only when offline.
   - ssic-content.js (the heavy ~7.5MB question bank + notes bundle): CACHE-FIRST → instant on repeat
     opens. It's versioned via ?v= in the loader, so bumping that version fetches a fresh copy.
   - Firebase / Firestore / Google APIs: NEVER intercepted (Firestore has its own offline cache). */
const CACHE = 'ssic-v1';

self.addEventListener('install', function (e) { self.skipWaiting(); });

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return k !== CACHE ? caches.delete(k) : null; })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  // Only handle our own origin; never touch Firebase/Firestore/CDN (they manage their own caching).
  if (url.origin !== self.location.origin) return;

  const isShell = req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html');
  if (isShell) {
    // Cache-first-with-network-race: serve the cached shell INSTANTLY (like the old HTTP cache), but
    // race it against the network — if the network responds within the timeout the fresh copy wins
    // (so deploys land immediately on decent connections); otherwise the cache is served and the
    // network keeps updating the cache in the background (so the NEXT load is fresh). First-ever load
    // (no cache) waits for the network. Net effect: warm loads are instant, no network wait on mobile.
    e.respondWith((async function () {
      const cache = await caches.open(CACHE);
      const cached = (await cache.match(req)) || (await cache.match('/index.html')) || (await cache.match('/'));
      const network = fetch(req).then(function (resp) {
        if (resp && (resp.ok || resp.type === 'opaque')) cache.put(req, resp.clone());
        return resp;
      });
      if (!cached) return network.catch(function () { return caches.match('/index.html'); }); // cold start: must wait
      return Promise.race([
        network.catch(function () { return cached; }),
        new Promise(function (resolve) { setTimeout(function () { resolve(cached); }, 1500); })
      ]);
    })());
    return;
  }

  if (url.pathname.indexOf('ssic-content.js') >= 0) {
    // cache-first for the big content bundle (versioned URL)
    e.respondWith(
      caches.match(req).then(function (m) {
        return m || fetch(req).then(function (resp) {
          const copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return resp;
        });
      })
    );
    return;
  }

  // Anything else same-origin: network, fall back to cache if offline.
  e.respondWith(fetch(req).catch(function () { return caches.match(req); }));
});
