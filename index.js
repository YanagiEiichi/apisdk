export default class API extends Function { // eslint-disable-line no-unused-vars
  
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
    return async config => {
      config = Object.assign({ method: key.toUpperCase() }, this.globalConfig, config);
      // Convert request body to JSON
      if (typeof config.body === 'object' && !(config.body instanceof Blob) && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
        let headers = new Headers(config.headers || {});
        if (!headers.has('Content-Type')) headers.append('Content-Type', 'application/json');
        config.headers = headers;
      }
      // Request actually
      let response = await fetch(this.path, config);
      Object.defineProperty(response, 'auto', {
        configurable: true,
        async value() {
          if (this.status === 204) return null;
          const mime = this.headers.get('Content-Type') || 'unknown';
          const type = mime.match(/\b(json|text|$)\b/g).filter(Boolean).sort()[0] || 'blob';
          return this[type]();
        }
      });
      if (config.rawResponse) return response;
      if (response.ok) return response.auto();
      throw await response.auto();
    };
  } 
  
}
