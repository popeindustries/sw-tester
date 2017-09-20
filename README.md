[![NPM Version](https://img.shields.io/npm/v/sw-tester.svg?style=flat)](https://npmjs.org/package/sw-tester)
[![Build Status](https://img.shields.io/travis/popeindustries/sw-tester.svg?style=flat)](https://travis-ci.org/popeindustries/sw-tester)

# `ServiceWorker` Testing made easy

`sw-tester` extends the utility of [`sw-test-env`](https://github.com/popeindustries/sw-test-env) by enabling you to write *one* set of tests for both the command line *and* the browser. Write tests against the mock `ServiceWorker` API provided by [`sw-test-env`](https://github.com/popeindustries/sw-test-env#api), then run those same tests seamlessly in the browser!

Tests are written in [mocha](https://mochajs.org) with [chai](http://chaijs.com), and in addition to the functionality provided by `sw-test-env`, `sw-tester` includes a `testServer` that simplifies working with network requests triggered during `ServiceWorker` testing.

## Usage

1. Install with npm:

```bash
$ npm install --save-dev sw-tester
```

2. Write mocha/chai test file using [`mochServiceWorker`](https://github.com/popeindustries/sw-test-env#api) and [`testServer`](#testserver):

```js
const { expect } = require('chai');
const { mockServiceWorker, testServer } = require('sw-tester');

let server, swClient;

describe('Installation', () => {
  before(async () => {
    server = await testServer.create({ port: 3333, latency: 20 });
    swClient = await mockServiceWorker.connect('http://localhost:3333/', 'src');
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
  });
});

```

3. Add commands to package.json `scripts`:

```json
{
  "scripts": {
    "test:node": "swtester node test/*-test.js",
    "test:browser": "swtester browser test/*-test.js"
  }
}
```

4. Run tests on the command line:

```bash
$ npm run test:node
```

5. Run tests in the browser:

```bash
$ npm run test:browser

# Test server started.

# Point your browser at http://localhost:3333/test?files=test/1-install-test.js,test/2-activate-test.js
```

## How does it work?

When running `$ swtester node <files>`, tests are run with Mocha on the command line using the `ServiceWorker` sandbox created via `mockServiceWorker`, and any network requests triggered by a `ServiceWorker` (or triggered by a test) are handled by the testing server created via `testServer`.

When running `$ swtester browser <files>`, a `testServer` is started in order to generate an html page that will run tests with Mocha in the browser. Individual test files are run sequentially in unique iframes in order to isolate installed `ServiceWorkers` from each other, the `mockServiceWorker` API is proxied to the browser's `ServiceWorker` API, and any network requests triggered by a `ServiceWorker` (or triggered by a test) are handled by the same testing server.

## API

### `mockServiceWorker`

Alias for [`sw-test-env` API](https://github.com/popeindustries/sw-test-env#api)

### `testServer`

#### `create(options: Object): Object`

Create a [koa](http://koajs.com/) test server for handling network requests from a `ServiceWorker`.

`options` include:

- **`port: Number`** the port number to expose on `localhost`. Will use `process.env.PORT` if not specified here (defaults to `3333`)
- **`latency: Number`** the minimum amount of random artificial latency to introduce (in `ms`) for responses (defaults to `50`)
- **`webroot: String`** the subpath from `process.cwd()` to preppend to relative paths (default none)
- **`routes: (app: Application) => void`** register server middleware/routes with passed `app` instance

```js
const { testServer } = require('sw-tester');
const server = await testServer.create({ port: 8080, latency: 20, webroot: 'lib' });
```

If unable to resolve a request to a local file, `testServer` will respond with a dummy file of the appropriate type. This makes it easy to test pre-caching, for example, without having to correctly resolve paths or create mocks. In addition, `testServer` supports the following special query parameters:

- **`offline`** simulate an offline state by terminating the request (`fetch('http://localhost:3333/foo.js?offline')`)
- **`error`** return a 500 server error response (fetch('http://localhost:3333/foo.js?error'))
- **`missing`** return a 404 not found response (fetch('http://localhost:3333/foo.js?missing'))
- **`maxage=value`** configure `Cache-Control: public, max-age={value}` cache header (fetch('http://localhost:3333/foo.js?maxage=10'))

The object returned from `create()` contains the following properties:

- **`app: Application`** the *koa* application instance
- **`port: Number`** the assigned port number
- **`server: HTTPServer`** the underlying `HTTPServer` instance
- **`destroy(): Promise`** close server and all outstanding connections
