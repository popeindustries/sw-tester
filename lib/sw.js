self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});
self.addEventListener('error', onUnhandledError);
self.addEventListener('unhandledrejection', onUnhandledError);

async function onUnhandledError(event) {
  const clients = await self.clients.matchAll();

  clients.forEach(client => {
    console.log(client)
    client.postMessage({ error: `unhandled error: ${event.reason || event}` });
  });
}