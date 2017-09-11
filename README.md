[![NPM Version](https://img.shields.io/npm/v/sw-tester.svg?style=flat)](https://npmjs.org/package/sw-tester)
[![Build Status](https://img.shields.io/travis/popeindustries/sw-tester.svg?style=flat)](https://travis-ci.org/popeindustries/sw-tester)

# `ServiceWorker` Testing made easy

`sw-tester` extends the utility of [`sw-test-env`](https://github.com/popeindustries/sw-test-env) by enabling you to write one set of tests for the command line *and* the browser. Write tests against the mock `ServiceWorker` API provided by [`sw-test-env`](https://github.com/popeindustries/sw-test-env#api), then run those same tests seamlessly in the browser!

Tests are written in [mocha](https://mochajs.org) with [chai](http://chaijs.com), and in addition to the functionality provided by `sw-test-env`, `sw-tester` includes a `testServer` that simplifies working with network requests triggered during `ServiceWorker` testing.

## API

### `mockServiceWorker`

Alias for [`sw-test-env` API](https://github.com/popeindustries/sw-test-env#api):

```js
const { expect } = require('chai');
const { mockServiceWorker } = require('sw-tester');
let swClient;

describe('installation', () => {
  before(async () => {
    swClient = mockServiceWorker.connect('http://localhost:3333/', 'src');
    await swClient.register('../src/sw.js');
  });
  it('should pre-cache assets', async () => {
    await swClient.trigger('install');
    const cache = await swClient.scope.caches.open('test');

    expect(await cache.match('/index.js')).to.exist;
  });
});

```

### `testServer`

#### `create(options: Object): Object`

Create a [koa](http://koajs.com/) test server for handling network requests from a `ServiceWorker`.

`options` include:

- **`port: Number`** the port number to expose on `localhost`. Will use `process.env.PORT` if not specified here (defaults to `3333`)
- **`latency: Number`** the minimum amount of random artificial latency to introduce (in `ms`) for responses (defaults to `50`)
- **`webroot: String`** the subpath from `process.cwd()` to preppend to relative paths (defaults to '')
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
- **`destroy()`** close server and all outstanding connections

## Browser testing

To run one or more test files in a browser context, execute the `swtester` command (via *package.json* `scripts`), passing a filepath glob pattern:

```json
{
  "scripts": {
    "test:browser": "swtester test/*-test.js"
  }
}
```
```bash
$ npm run test:browser
```

The command will start a server, printing out the url to a test page that will run each test file in an embedded `<iframe>`. In this way, each `ServiceWorker` install will be isolated from every other (though this generally requires that you test only one `ServiceWorker` context per file).