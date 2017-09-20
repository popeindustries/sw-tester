const { get, post } = require('koa-route');
const { sync: glob } = require('glob');
const bodyParser = require('koa-bodyparser');
const debug = require('debug')('sw-tester');
const fs = require('fs');
const Koa = require('koa');
const path = require('path');
const testTmpl = require('./test.tmpl');
const testFrameTmpl = require('./testFrame.tmpl');

const DEFAULT_PORT = 3333;
const DEFAULT_LATENCY = 50;
const SW = fs.readFileSync(path.resolve(__dirname, './sw.js'), 'utf8');

module.exports = {
  /**
   * Create test server
   * @param {Object} options
   * @returns {Object}
   */
  create(options = {}) {
    const { latency = DEFAULT_LATENCY, port = process.env.PORT || DEFAULT_PORT, routes, webroot = '' } = options;

    return new Promise((resolve, reject) => {
      const app = new Koa();
      const connections = {};

      app.use(bodyParser());
      app.use(offline());
      app.use(config());
      app.use(slow(latency));
      app.use(testFrame());
      app.use(test());
      if (routes) {
        routes(app);
      }
      app.use(all(webroot));

      try {
        const server = app.listen(port, () => {
          resolve({
            app,
            port,
            server,
            destroy() {
              return new Promise((resolve, reject) => {
                if (server) {
                  server.close(resolve);
                } else {
                  reject(Error('no server started'));
                }
                for (const key in connections) {
                  connections[key].destroy();
                }
              });
            }
          });
        });

        // server-destroy
        server.on('connection', connection => {
          const key = connection.remoteAddress + ':' + connection.remotePort;

          connections[key] = connection;
          connection.on('close', () => {
            delete connections[key];
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  }
};

function init(app, options = {}) {
  const { latency = DEFAULT_LATENCY, webroot = process.cwd() } = options;

  for (let i = 0, n = app.middleware.length; i < n; i++) {
    const middleware = app.middleware[i];

    if (latency && middleware.name && middleware.name == 'slow') {
      app.middleware[i] = slow(latency);
    }
    if (webroot && middleware.name && middleware.name == 'all') {
      app.middleware[i] = all(webroot);
    }
  }

  debug(`init with latency: ${latency}, webroot: ${webroot}`);
}

function config() {
  return post('/config', async ctx => {
    init(ctx.app, ctx.request.body);
    ctx.body = ctx.request.body;
  });
}

function test() {
  return get('/test', async (ctx, frame, id) => {
    const { files } = ctx.query;

    if (!files) {
      ctx.throw(Error('missing "files" query parameter'));
    }

    ctx.state.files = glob(decodeURI(files));

    const body = await testTmpl(ctx);

    ctx.set('Content-Length', Buffer.from(body, 'utf8').length);
    ctx.set('Cache-Control', `no-cache, no-store`);
    ctx.type = 'html';
    ctx.body = body;
  });
}

function testFrame() {
  return get('/test/frame/:id(\\d+)', async (ctx, id) => {
    const { file } = ctx.query;

    if (!file) {
      ctx.throw(Error('missing "file" query parameter'));
    }

    ctx.state.file = `/${decodeURI(file)}`;

    const body = await testFrameTmpl(ctx);

    ctx.set('Content-Length', Buffer.from(body, 'utf8').length);
    ctx.set('Cache-Control', `no-cache, no-store`);
    ctx.set('Service-Worker-Allowed', '/');
    ctx.type = 'html';
    ctx.body = body;
  });
}

function all(webroot) {
  return async function all(ctx) {
    const { error, maxage = 2, missing } = ctx.query;

    if (error != null || missing != null) {
      if (error != null) {
        ctx.status = 500;
        ctx.body = 'error';
      }
      debug(`not ok: ${ctx.path} responding with ${ctx.status}`);
      return;
    }

    let filepath = path.resolve(path.join(webroot, ctx.path.slice(1)));
    const type = resolveType(ctx);
    let body = '';
    let size = 5;
    let stat;

    if (!fs.existsSync(filepath)) {
      filepath = path.resolve(ctx.path.slice(1));
    }

    try {
      stat = fs.statSync(filepath);
      size = stat.size;
    } catch (err) {
      body = '"hello"';
    }

    if ('service-worker' in ctx.request.headers) {
      if (body) {
        debug(`not ok: ${ctx.path} Service Worker not found`);
        return ctx.throw(404, 'Service Worker not found');
      }
      // Prepend clients.claim()
      body = `${SW}\n\n${fs.readFileSync(filepath, 'utf8')}`;
    }

    ctx.set('Content-Length', size);
    ctx.set('Cache-Control', `public, max-age=${maxage}`);
    ctx.set('Service-Worker-Allowed', '/');
    ctx.type = type;
    ctx.body = body || fs.createReadStream(filepath);

    debug(body ? `ok: ${ctx.path} responding with dummy file` : `ok: ${ctx.path} responding with file`);
  };
}

function offline() {
  return async function offline(ctx, next) {
    if ('offline' in ctx.query) {
      ctx.respond = false;
      ctx.socket.destroy();
      return;
    }
    return next();
  };
}

function slow(min) {
  return async function slow(ctx, next) {
    if (!/^sw/.test(path.basename(ctx.path)) || 'service-worker' in ctx.request.headers) {
      await latency(min);
    }
    return next();
  };
}

function latency(min) {
  if (!min) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    setTimeout(resolve, min + Math.random() * min);
  });
}

function resolveType(ctx) {
  const extension = path.extname(ctx.path).slice(1);
  let type = '';

  if (extension) {
    type = extension;
  } else if (ctx.accepts('html')) {
    type = 'html';
  } else if (ctx.accepts('js')) {
    type = 'js';
  } else if (ctx.accepts('css')) {
    type = 'css';
  }

  return type;
}
