const { expect } = require('chai');
const { mockServiceWorker, testServer } = require(typeof window != 'undefined'
  ? 'sw-tester'
  : '../../index');

let server, swClient;

describe('Installation', () => {
  before(async () => {
    server = await testServer.create({ port: 3333, latency: 20 });
    swClient = await mockServiceWorker.connect('http://localhost:3333/', 'test/fixtures/src');
    await swClient.register('sw.js');
  });
  after(async () => {
    await mockServiceWorker.destroy();
    await server.destroy();
  });

  it('should pre-cache assets', async () => {
    await swClient.trigger('install');
    const cache = await swClient.scope.caches.open('test');

    expect(await cache.match('/index.js')).to.exist;
    expect(await cache.match('/index.css')).to.exist;
    expect(await cache.match('/offline.html')).to.exist;
  });
});
