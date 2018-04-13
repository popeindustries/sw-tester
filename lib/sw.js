/* global clients */

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/config') {
    event.respondWith(fetch(event.request));
  }
});
self.addEventListener('error', onUnhandledError);
self.addEventListener('unhandledrejection', onUnhandledError);

async function onUnhandledError(event) {
  const matchedClients = await clients.matchAll();

  matchedClients.forEach((client) => {
    console.log(client);
    client.postMessage({ error: `unhandled error: ${event.reason || event}` });
  });
}
