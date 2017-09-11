(function() {
  const oldRegister = ServiceWorkerContainer.prototype.register;

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
        return navigator.serviceWorker;
      },
      destroy() {}
    }
  };
  window.clean = clean;

  ServiceWorkerContainer.prototype.register = function register(scriptURL, options) {
    // Resolve relative paths based on file path
    if (scriptURL.charAt(0) == '.') {
      const testpath = /\?file=(.+)/.exec(location.search)[1];
      let dir = testpath.slice(0, testpath.lastIndexOf('/'));

      if (scriptURL.charAt(1) == '.') {
        dir = !dir.includes('/') ? '' : `/${dir.slice(0, dir.lastIndexOf('/'))}`;
      }
      scriptURL = `${dir}/${scriptURL.slice(scriptURL.indexOf('/') + 1)}`;
    }

    return oldRegister.call(this, scriptURL, { scope: location.pathname })
  }
  ServiceWorkerContainer.prototype.trigger = function trigger(eventType, ...args) {
    switch(eventType) {
      case 'install':
        return getRegistrationAtState('installed');
        break;
      case 'activate':
        return getRegistrationAtState('activated');
        break;
      case 'fetch':
        return fetch(...args);
        break;
    }
  };
  ServiceWorkerContainer.prototype.scope = {
    caches
  };

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
        const onStateChange = evt => {
          if (evt.target.state == state) {
            sw.removeEventListener('statechange', onStateChange);
            resolve(registration);
            return;
          }
          if (evt.target.state == 'redundant') {
            sw.removeEventListener('statechange', onStateChange);
            reject(Error('installing ServiceWorker has become redundant'));
          }
        }
        sw.addEventListener('statechange', onStateChange);
      });
    });
  }

  function unregister() {
    return navigator.serviceWorker.getRegistrations().then(registrations => {
      return Promise.all(registrations.map(registration => registration.unregister()));
    });
  }

  function cleanCaches() {
    return caches.keys().then(keys => {
      return Promise.all(keys.map(key => window.caches.delete(key)));
    });
  }

  function clean() {
    return Promise.all([unregister(), cleanCaches()]);
  }
})();
