'use strict';

const { expect } = require('chai');
const { testServer } = require('../');
const fetch = require('node-fetch');

describe('sw-test-utils', () => {
  let server;

  describe('testServer', () => {
    afterEach(async () => {
      if (server) {
        server.destroy();
      }
    });

    it('should create server with default "port"', async () => {
      server = await testServer.create();

      expect(server).to.have.property('port', 3333);
    });
    it('should create server with specific "port"', async () => {
      server = await testServer.create({ port: 3332 });

      expect(server).to.have.property('port', 3332);
    });
    it('should respond to requests for resources using default "webroot"', async () => {
      server = await testServer.create();
      const response = await fetch('http://localhost:3333/index.js');

      expect(response).to.exist;
      expect(await response.text()).to.contain('mockServiceWorker');
    });
    it('should respond to requests for resources using specific "webroot"', async () => {
      server = await testServer.create({ webroot: 'lib' });
      const response = await fetch('http://localhost:3333/server.js');

      expect(response).to.exist;
      expect(await response.text()).to.contain('DEFAULT_PORT');
    });
    it('should configure custom routes');
    it('should add default connection latency to each request', async () => {
      server = await testServer.create();
      const start = Date.now();
      const response = await fetch('http://localhost:3333/foo.js');

      expect(response).to.exist;
      expect(Date.now() - start).to.be.within(50, 150);
    });
    it('should add configured connection latency to each request', async () => {
      server = await testServer.create({ latency: 0 });
      const start = Date.now();
      const response = await fetch('http://localhost:3333/foo.js');

      expect(response).to.exist;
      expect(Date.now() - start).to.be.within(0, 50);
    });
    it('should respond to requests for fake resources', async () => {
      server = await testServer.create();
      const response = await fetch('http://localhost:3333/foo.js');

      expect(response).to.exist;
      expect(await response.text()).to.contain('hello');
    });
    it('should respond with 500 when "?error"', async () => {
      server = await testServer.create();
      const response = await fetch('http://localhost:3333/foo.js?error');

      expect(response).to.exist;
      expect(response.status).to.equal(500);
    });
    it('should respond with 404 when "?missing"', async () => {
      server = await testServer.create();
      const response = await fetch('http://localhost:3333/foo.js?missing');

      expect(response).to.exist;
      expect(response.status).to.equal(404);
    });
    it('should simulate offline when "?offline"', async () => {
      server = await testServer.create();
      try {
        await fetch('http://localhost:3333/foo.js?offline');
        expect(Error('should have errored'));
      } catch (err) {
        expect(err).to.have.property('code', 'ECONNRESET');
      }
    });
    it('should respond with custon "max-age"', async () => {
      server = await testServer.create();
      const response = await fetch('http://localhost:3333/foo.js?maxage=10');

      expect(response).to.exist;
      expect(response.headers.get('Cache-Control')).to.contain('max-age=10');
    });
    it('should render test page', async () => {
      server = await testServer.create();
      const response = await fetch('http://localhost:3333/test?files=test/test-browser.js');
      const html = await response.text();

      expect(html).to.contain('file=test/test-browser.js"></iframe>');
    });
    it('should render test frame page', async () => {
      server = await testServer.create();
      const response = await fetch('http://localhost:3333/test/frame/1234?file=test/test-browser.js');
      const html = await response.text();

      expect(html).to.contain('<script src="/test/test-browser.js"></script>');
    });
  });
});
