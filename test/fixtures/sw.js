importScripts('/utils.js');

const ID = 'test';
const ASSETS = ['/index.css', '/index.js', '/offline.html'];

self.addEventListener('install', event => {
  event.waitUntil(installation(ID, ASSETS));
});

self.addEventListener('activate', event => {
  event.waitUntil(activation(ID));
});

self.addEventListener('fetch', event => {
  event.respondWith(respond(ID, event.request));
});
