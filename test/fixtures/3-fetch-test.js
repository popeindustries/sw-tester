const { expect } = require('chai');
const { mockServiceWorker, testServer } = require(typeof window != 'undefined'
  ? 'sw-tester'
  : '../../index');
const { Request, Response } = mockServiceWorker;

let server, swClient;

describe('Fetching', () => {
  before(async () => {
    server = await testServer.create({ port: 3333, latency: 20 });
    swClient = await mockServiceWorker.connect('http://localhost:3333/', 'test/fixtures/src');
    await swClient.register('sw.js');
  });
  after(async () => {
    await mockServiceWorker.destroy();
    await server.destroy();
  });

  it('should return pre-cached resource', async () => {
    await swClient.ready;
    const cache = await swClient.scope.caches.open('test');
    await cache.put(`http://localhost:3333/index.js`, new Response('hello world', { status: 200 }));
    const response = await swClient.trigger('fetch', `http://localhost:3333/index.js`);

    expect(await response.text()).to.equal('hello world');
  });
  it('should runtime cache a resource', async () => {
    await swClient.ready;

    const cache = await swClient.scope.caches.open('test');
    const response = await swClient.trigger('fetch', `http://localhost:3333/foo.js`);

    expect(await cache.keys()).to.have.length(4);

    const cachedResponse = await cache.match(`http://localhost:3333/foo.js`);

    expect(cachedResponse).to.exist;
    expect(await cachedResponse.text()).to.equal(await response.text());

    await cache.delete(`http://localhost:3333/foo.js`);
  });
  it('should not cache bad responses', async () => {
    await swClient.ready;

    const cache = await swClient.scope.caches.open('test');
    await swClient.trigger('fetch', `http://localhost:3333/foo.js?missing`);

    expect(await cache.keys()).to.have.length(3);

    const cachedResponse = await cache.match(`http://localhost:3333/foo.js`);

    expect(cachedResponse).to.not.exist;
  });
  it('should only cache same or trusted origin responses', async () => {
    await swClient.ready;

    const cache = await swClient.scope.caches.open('test');
    await swClient.trigger('fetch', 'https://fonts.googleapis.com/css?family=Roboto', {
      mode: 'cors'
    });

    expect(await cache.keys()).to.have.length(4);

    const cachedResponse = await cache.match('https://fonts.googleapis.com/css?family=Roboto');

    expect(cachedResponse).to.exist;

    await cache.delete('https://fonts.googleapis.com/css?family=Roboto');
  });
  it('should only cache GET requests', async () => {
    await swClient.ready;

    const cache = await swClient.scope.caches.open('test');
    await swClient.trigger('fetch', new Request(`http://localhost:3333/foo`, { method: 'post' }));

    expect(await cache.keys()).to.have.length(3);

    const cachedResponse = await cache.match(`http://localhost:3333/foo`);

    expect(cachedResponse).to.not.exist;
  });
  it('should return cached resource if not expired', async () => {
    await swClient.ready;

    const cache = await swClient.scope.caches.open('test');
    const request = new Request(`http://localhost:3333/api/foo`);
    const response = new Response('{ "foo": false }', {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=120',
        Date: new Date().toUTCString()
      }
    });

    await cache.put(request, response);
    const res = await swClient.trigger('fetch', request);

    expect(await res.json()).to.eql({ foo: false });

    await cache.delete(`http://localhost:3333/api/foo`);
  });
  it('should return network resource if expired', async () => {
    await swClient.ready;

    const cache = await swClient.scope.caches.open('test');
    const request = new Request(`http://localhost:3333/api/foo`);
    const response = new Response('{ "foo": false }', {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=120',
        Date: new Date(Date.now() - 10000000).toUTCString()
      }
    });

    await cache.put(request, response);
    const res = await swClient.trigger('fetch', request);

    expect(await res.json()).to.eql('hello');

    await cache.delete(`http://localhost:3333/api/foo`);
  });
  it('should return a fallback page when offline', async () => {
    await swClient.ready;

    const response = await swClient.trigger('fetch', `http://localhost:3333/index.html?offline`);
    const html = await response.text();

    expect(html).to.exist;
  });
});
