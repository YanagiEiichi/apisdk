class API extends Function {

  constructor(path = '/', config) {
    super('next', 'return this(next)');
    this.path = path;
    this.globalConfig = Object.assign({ credentials: 'include' }, config);
    return new Proxy(this.bind(next => {
      if (path[path.length - 1] !== '/') next = '/' + next;
      return new API((path + next).replace(/[^:][/]{2}/g, '/'), this.globalConfig);
    }), this);
  }

  get(base, key) {
    if (!/^(?:get|post|delete|put|patch)$/.test(key)) return base(key);
    return config => {
      config = Object.assign({ method: key.toUpperCase() }, this.globalConfig, config);
      // Convert request body to JSON
      if (typeof config.body === 'object' && !(config.body instanceof Blob) && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
        let headers = new Headers(config.headers || {});
        if (!headers.has('Content-Type')) headers.append('Content-Type', 'application/json');
        config.headers = headers;
      }
      // Request actually
      return fetch(this.path, config).then(response => {
        const type = /\bjson\b/.test(response.headers.get('Content-Type')) ? 'json' : 'text';
        switch (true) {
          case response.status === 204: return null;
          case response.status < 400: return response[type]();
          default: return response[type]().then(result => Promise.reject(result));
        }
      });
    };
  }

}
