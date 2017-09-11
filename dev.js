'use strict';

const { watch } = require('chokidar');
const { start, restart, refresh } = require('buddy-server');

const PORT = 3333;

const watcher = watch('.', {
  ignored: /(^|[\/\\])\..|node_modules/,
  ignoreInitial: true,
  persistent: true
});

watcher.on('add', onUpdate);
watcher.on('change', onUpdate);
watcher.on('unlink', onUpdate);

start(
  true,
  true,
  {
    file: 'dev-server.js',
    port: PORT
  },
  err => {
    if (err) {
      throw err;
    }
  }
);

function onUpdate(path) {
  console.log('   + changed:', path);

  restart(err => {
    if (err) {
      return console.log(err);
    }
    refresh('foo.js');
  });
}
