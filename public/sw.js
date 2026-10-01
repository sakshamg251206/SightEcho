/**
 * Offline support. The app shell and the MediaPipe runtime are cached on first
 * visit; the model itself lives in the Origin Private File System, not here.
 *
 * - Page navigations: network first, falling back to the cached page offline.
 * - Everything else on this origin: cache first (build assets are content-hashed).
 */
const CACHE = 'sightecho-v1';
const SCOPE = self.registration.scope;
const CORE = [
  '',
  'manifest.webmanifest',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'mediapipe/genai_wasm_internal.js',
  'mediapipe/genai_wasm_internal.wasm',
];

async function precache() {
  const cache = await caches.open(CACHE);
  const urls = new Set(CORE.map((path) => new URL(path, SCOPE).href));

  // The page loaded before this worker existed, so collect the hashed bundles
  // it references and cache them too.
  try {
    const html = await (await fetch(SCOPE, { cache: 'no-cache' })).text();
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const url = new URL(match[1], SCOPE);
      if (url.origin === self.location.origin) urls.add(url.href);
    }
  } catch {
    // Offline during install; the core list is still attempted below.
  }

  await Promise.all(
    [...urls].map((url) =>
      cache.add(url).catch(() => {
        // One missing optional file should not prevent installation.
      }),
    ),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          if (response.ok) caches.open(CACHE).then((cache) => cache.put(SCOPE, copy));
          return response;
        })
        .catch(async () => (await caches.match(SCOPE)) ?? Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
