class API extends Function {

  constructor(path = '/', config) {
    super('next', 'return this(next)');
    this.path = path;
    this.globalConfig = Object.assign({ credentials: 'include' }, config);
    return new Proxy(this.bind(next => {
      return new API((path + '/' + next).replace(/[^:][/]{2}/g, '/'), this.globalConfig);
    }), this);
  }

  get(base, key) {
    if (!/^(?:get|post|delete|put|patch)$/.test(key)) return base(key);
    return config => {
      config = Object.assign({ method: key }, this.globalConfig, config);
      return fetch(this.path, config).then(response => {
        const type = /\bjson\b/.test(response.headers.get('content-type')) ? 'json' : 'text';
        switch (true) {
          case response.status === 204: return null;
          case response.status < 400: return response[type]();
          default: response[type]().then(result => { throw result; });
        }
      });
    };
  }

}
