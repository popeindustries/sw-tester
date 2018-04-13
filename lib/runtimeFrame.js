(function() {
  const oldRegister = ServiceWorkerContainer.prototype.register;
  let root = '/';

  window.require = function require(id) {
    return window[id] || {};
  };
  window['sw-tester'] = {
    testServer: {
      create(options = {}) {
        if (options.port) {
          console.warn('unable to change port number from client');
        }
        return new Promise((resolve, reject) => {
          fetch('/config', {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            },
            method: 'post',
            body: JSON.stringify(options)
          }).then(() => {
            resolve({
              destroy() {
                fetch('/config', {
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                  },
                  method: 'post',
                  body: JSON.stringify({})
                });
                return Promise.resolve();
              }
            });
          });
        });
      }
    },
    mockServiceWorker: {
      Headers,
      MessageChannel,
      Request,
      Response,
      connect(url, webroot) {
        if (webroot) {
          root = webroot;
          if (root.charAt(0) != '/') {
            root = `/${root}`;
          }
        }
        return Promise.resolve(navigator.serviceWorker);
      },
      destroy() {
        return window.clean();
      }
    },
    sleep: function sleep(duration) {
      return new Promise((resolve, reject) => {
        setTimeout(resolve, duration);
      });
    }
  };
  window.test = function test() {
    return new Promise((resolve, reject) => {
      const results = mocha.run();

      results.on('end', () => {
        resolve(results);
      });
    });
  };
  window.clean = clean;

  ServiceWorkerContainer.prototype.register = function register(scriptURL, options) {
    // Resolve relative paths based on webroot
    if (scriptURL.charAt(0) != '/') {
      scriptURL = `${root}/${scriptURL}`.replace(/\/\//g, '/');
    }

    return oldRegister.call(this, scriptURL, { scope: location.pathname });
  };
  ServiceWorkerContainer.prototype.trigger = function trigger(eventType, ...args) {
    switch (eventType) {
      case 'install':
        return getRegistrationAtState('installed');
      case 'activate':
        return getRegistrationAtState('activated');
      case 'fetch':
        return fetch(...args);
    }
  };
  ServiceWorkerContainer.prototype.scope = {
    caches
  };

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.error) {
      throw Error(event.data.error);
    }
  });

  function getRegistrationAtState(state) {
    return new Promise((resolve, reject) => {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (!registration) {
          return reject(Error('no ServiceWorker registered'));
        }

        if (
          (state == 'installed' && (registration.waiting || registration.active)) ||
          (state == 'activated' && registration.active)
        ) {
          return resolve(registration);
        }

        const sw = registration.installing || registration.waiting || registration.active;
        const onStateChange = (evt) => {
          if (evt.target.state == state) {
            sw.removeEventListener('statechange', onStateChange);
            resolve(registration);
            return;
          }
          if (evt.target.state == 'redundant') {
            sw.removeEventListener('statechange', onStateChange);
            reject(Error('installing ServiceWorker has become redundant'));
          }
        };
        sw.addEventListener('statechange', onStateChange);
      });
    });
  }

  function unregister() {
    return navigator.serviceWorker.getRegistrations().then((registrations) => {
      return Promise.all(registrations.map((registration) => registration.unregister()));
    });
  }

  function cleanCaches() {
    return caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => window.caches.delete(key)));
    });
  }

  function clean() {
    return Promise.all([unregister(), cleanCaches()]);
  }
})();
