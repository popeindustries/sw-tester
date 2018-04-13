const { expect } = require('chai');
const { mockServiceWorker, sleep, testServer } = require(typeof window != 'undefined'
  ? 'sw-tester'
  : '../../index');

let server, swClient;

describe('Messaging', () => {
  before(async () => {
    server = await testServer.create({ port: 3333, latency: 20 });
    swClient = await mockServiceWorker.connect('http://localhost:3333/', 'test/fixtures/src');
    await swClient.register('sw.js');
  });
  after(async () => {
    await mockServiceWorker.destroy();
    await server.destroy();
  });

  it('should not notify clients when fetching cached resource', async () => {
    await swClient.ready;

    let called = false;

    swClient.addEventListener('message', (event) => {
      called = true;
    });

    await await swClient.trigger('fetch', `http://localhost:3333/index.js`);
    await sleep(100);

    expect(called).to.equal(false);
  });
  it('should notify clients when successfully fetching network resource', async () => {
    await swClient.ready;

    const cache = await swClient.scope.caches.open('test');
    let called = false;
    let cb;

    swClient.addEventListener(
      'message',
      (cb = (event) => {
        called = true;
        expect(event.data).to.have.property('msg', 'online');
      })
    );

    await await swClient.trigger('fetch', `http://localhost:3333/dummy.js`);
    await sleep(100);

    expect(called).to.equal(true);

    swClient.removeEventListener('message', cb);
    await cache.delete(`http://localhost:3333/dummy.js`);
  });
  it('should notify clients when failure fetching network resource', async () => {
    await swClient.ready;

    let called = false;
    let cb;

    swClient.addEventListener(
      'message',
      (cb = (event) => {
        called = true;
        expect(event.data).to.have.property('msg', 'offline');
      })
    );

    try {
      await await swClient.trigger('fetch', `http://localhost:3333/dummy.js?offline`);
      await sleep(100);
    } finally {
      expect(called).to.equal(true);
    }
    swClient.removeEventListener('message', cb);
  });
});
