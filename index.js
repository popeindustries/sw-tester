'use strict';

module.exports = {
  testServer: require('./lib/server'),
  mockServiceWorker: require('sw-test-env')
};