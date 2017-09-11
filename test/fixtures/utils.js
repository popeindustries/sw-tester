async function installation(id, assets) {
  const cache = await caches.open(id);
  return cache.addAll(assets);
}

async function activation(id) {
  const keys = await caches.keys();

  await Promise.all(
    keys.map(key => {
      if (key != id) {
        return caches.delete(key);
      }
    })
  );
}

async function respond(id, request) {
  let response = await caches.match(request);

  if (!response || hasExpired(response)) {
    const cache = await caches.open(id);

    try {
      response = await fetch(request);
      if (request.method == 'GET' && response.ok && shouldCache(request)) {
        cache.put(request, response.clone());
      }
      updateOnlineStatus(true);
    } catch (err) {
      console.log(err)
      response = request.mode == 'navigate' || (request.headers.get('accept').includes('text/html'))
        ? await cache.match('/offline.html')
        : new Response('', { status: 499, statusText: 'network offline' });
      updateOnlineStatus(false);
    }
  }

  return response.clone();
}

function shouldCache(request) {
  const url = new URL(request.url);
  return url.origin == location.origin;
}

function hasExpired(response) {
  const cacheControl = response.headers.get('Cache-Control');

  if (!cacheControl) {
    return false;
  }

  const date = response.headers.get('Date');
  const maxAge = /max-age=(\d+)$/.exec(cacheControl);
  const expires = +new Date(date) + (maxAge && maxAge[1] ? parseInt(maxAge[1], 10) * 1000 : 0);

  return Date.now() > expires;
}

async function updateOnlineStatus(online) {
  const clients = await self.clients.matchAll();

  clients.forEach(client => {
    client.postMessage({ msg: online ? 'online' : 'offline' });
  });
}
