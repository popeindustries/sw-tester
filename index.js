'use strict';

module.exports = {
  testServer: require('./lib/server'),
  mockServiceWorker: require('sw-test-env'),
  sleep
};

function sleep(duration) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, duration);
  });
}
