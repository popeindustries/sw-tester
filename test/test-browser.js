const { expect } = require('chai');
const { mockServiceWorker: { connect, destroy }, testServer } = require('sw-test-utils');

let server, swClient;

describe('ServiceWorker testing', () => {
  before(async () => {
    server = await testServer.create({ port: 3333, latency: 20, webroot: 'test/fixtures' });
  });
  beforeEach(() => {
    swClient = connect('http://localhost:3333/', 'test/fixtures');
  });
  afterEach(() => {
    destroy();
  });
  after(async () => {
    if (server) {
      await server.destroy();
    }
  });

  describe('installation', () => {
    it('should pre-cache assets', async () => {
      await swClient.register('./fixtures/sw.js');
      await swClient.trigger('install');
      const cache = await swClient.scope.caches.open('test');

      expect(await cache.match('/index.js')).to.exist;
      expect(await cache.match('/index.css')).to.exist;
      expect(await cache.match('/offline.html')).to.exist;
    });
  });

});