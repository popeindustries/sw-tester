const fs = require('fs');
const Koa = require('koa');
const path = require('path');

const DEFAULT_PORT = 3333;
const DEFAULT_LATENCY = 50;

module.exports = {
  /**
   * Create test server
   * @param {Object} config
   * @returns {Object}
   */
  create(config = {}) {
    const { latency = DEFAULT_LATENCY, port = process.env.PORT || DEFAULT_PORT, routes, webroot = process.cwd() } = config;

    return new Promise((resolve, reject) => {
      const app = new Koa();
      const connections = {};

      app.use(offline());
      app.use(slow(latency));
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

function all(webroot) {
  return async function all(ctx) {
    const { error, maxage = 2, missing } = ctx.query;

    if (error != null || missing != null) {
      if (error != null) {
        ctx.status = 500;
        ctx.body = 'error';
      }
      return;
    }

    const filepath = path.resolve(path.join(webroot, ctx.path));
    const type = path.extname(filepath).slice(1) || 'js';
    let body = '';
    let size = 5;
    let stat;

    try {
      stat = fs.statSync(filepath);
      size = stat.size;
    } catch (err) {
      body = 'hello';
    }

    ctx.set('Content-Length', size);
    ctx.set('Cache-Control', `public, max-age=${maxage}`);
    ctx.type = type;
    ctx.body = body || fs.createReadStream(filepath);
  }
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
    if (!/^sw/.test(path.basename(ctx.path))) {
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
