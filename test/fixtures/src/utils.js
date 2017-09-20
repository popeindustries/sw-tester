async function installation(id) {
  const cache = await caches.open(id);

  return cache.addAll(ASSETS);
}

async function activation(id) {
  const keys = await caches.keys();

  return Promise.all(
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
      // console.log(response)
      if (shouldCache(request, response)) {
        await cache.put(request.clone(), response.clone());
      }
      updateOnlineStatus(true);
    } catch (err) {
      const url = new URL(request.url);

      response =
        request.mode == 'navigate' || request.headers.get('accept').includes('text/html')
          ? await cache.match(`${url.origin}/offline.html`)
          : new Response('', { status: 499, statusText: 'network offline' });
      updateOnlineStatus(false);
    }
  }

  return response.clone();
}

function shouldHandle(request) {
  const url = new URL(request.url);

  return request.method == 'GET' && (url.origin == location.origin || /.googleapis.com$/.test(url.hostname));
}

function hasExpired(response) {
  const cacheControl = response.headers.get('Cache-Control');
  const date = response.headers.get('Date');

  if (!cacheControl || !date) {
    return false;
  }

  const maxAge = /max-age=(\d+)$/.exec(cacheControl);
  const expires = +new Date(date) + (maxAge && maxAge[1] ? parseInt(maxAge[1], 10) * 1000 : 0);

  return Date.now() > expires;
}

function shouldCache(request, response) {
  if (response.ok) {
    return true;
  }

  const url = new URL(request.url);

  return response.type == 'opaque' && url.hostname == 'googleapis.com';
}

async function updateOnlineStatus(online) {
  const clients = await self.clients.matchAll();

  clients.forEach(client => {
    client.postMessage({ msg: online ? 'online' : 'offline' });
  });
}
