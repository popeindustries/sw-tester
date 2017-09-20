const { expect } = require('chai');
const { mockServiceWorker, sleep, testServer } = require('sw-tester');

let server, swClient;

describe('Activation', () => {
  before(async () => {
    server = await testServer.create({ port: 3333, latency: 20 });
    swClient = await mockServiceWorker.connect('http://localhost:3333/', '/test/fixtures');
    await swClient.register('/test/fixtures/sw.js');
    await swClient.scope.caches.open('old');
  });
  after(async () => {
    await mockServiceWorker.destroy();
    await server.destroy();
  });

  it('should remove old caches', async () => {
    await swClient.ready;
    await sleep(10);

    expect(await swClient.scope.caches.has('old')).to.equal(false);
  });
});
