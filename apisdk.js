/**/ void function() {

// UMD
var umd = function(name, component) {
  switch(true) {
    // CommonJS
    case typeof module === 'object' && !!module.exports:
      module.exports = component;
      break;
    // AMD (Add a 'String' wrapper here to fuck webpack)
    case String(typeof define) === 'function' && !!define.amd:
      define(name, function() { return component; });
      break;
    // Global
    default:
      /**/ try { /* Fuck IE8- */
      /**/   if(typeof execScript === 'object') execScript('var ' + name);
      /**/ } catch(error) {}
      window[name] = component;
  }
};

// Internal Part class
var Part = function(config) {
  if(config) this.config = config;
};

// To convert a API list to a raw tree struct
Part.listToRawTree = function(list) {
  var root = {};
  var i, j, k, path, methods, name;
  for(i = 0; i < list.length; i++) {
    if(!/^(\S+)\s+\/(\S*)$/.test(list[i])) {
      throw new Error('What\'s the fucking api defintion "' + list[i] + '"?');
    }
    methods = RegExp.$1;
    path = RegExp.$2.split('/');
    for(k = root, j = 0; j < path.length; j++) {
      // Supported formats: {xxx} [xxx] (xxx) <xxx> :xxx *
      name = path[j].replace(/^(?:\{.*\}|\[.*\]|\(.*\)|<.*>|:.*|\*)$/, '#rawSubTree');
      k = k[name] = Object(k[name]);
    }
    methods = methods.replace(/.*\*.*/, 'GET,POST,PUT,DELETE,PATCH');
    k['#methods'] = (k['#methods'] || []).concat(methods.match(/\w+/g));
  }
  return root;
};

// It's prototype is an array, every part of API path is an array item
Part.prototype = [];

// Return the actual API path
Part.prototype.getPath = function() {
  var that = this;
  var result = [];
  for(var i = 0; i < this.length; i++) {
    // Resolve function result
    result[i] = function callee(what) {
      if(typeof what !== 'function') return what;
      return callee(what());
    }(this[i]);
  }
  if(this.config.promise) {
    return this.config.promise.all(result).then(function(path) {
      return that.wrapHost(path);
    });
  } else {
    return this.wrapHost(result);
  }
};

// Concat host to path
Part.prototype.wrapHost = function(path) {
  var host = this.config.host;
  host = host == null ? '/api' : host + '';
  if(host.charAt(host.length - 1) !== '/') host += '/';
  host = host.replace(/^(?!\w+:\/\/)(?!\/)/, '/');
  return host + path.map(encodeURIComponent).join('/');
};

// Create child node that inherit from current node
Part.prototype.createChild = function(name) {
  var Part = function() {};
  Part.prototype = this;
  var node = new Part();
  node.push(name);
  return node;
};

// Create a callable HTTP method as property of current node
Part.prototype.buildMethod = function(method) {
  var node = this;
  return function(data) {
    var what = node.getPath();
    var launch = function(path) {
      return node.config.http({ method: method, url: path, data: data });
    };
    if(typeof what === 'string') {
      return launch(what);
    } else {
      return what.then(launch);
    }
  };
};

// Load API path data into current node from a raw tree and return a handler
Part.prototype.loadRawTree = function(rawTree) {
  var that = this;
  var rawSubTree = rawTree['#rawSubTree'] || {};
  var methods = rawTree['#methods'] || [];
  var handler = function(name) {
    return handler[name] = that.createChild(name).loadRawTree(rawSubTree);
  };
  for(var name in rawTree) {
    if(name.charAt(0) === '#') continue;
    handler[name] = this.createChild(name).loadRawTree(rawTree[name]);
  }
  for(var i = 0; i < methods.length; i++) {
    handler[methods[i].toLowerCase()] = this.buildMethod(methods[i]);
  }
  return handler;
};


// Warning
var warn = function(message) {
  window.console && console.warn && console.warn(message);
};


// Interface
var Apisdk = function(list, config) {
  config = Object(config);
  config.promise = config.promise || window.Promise;
  // Check "http" service
  if(typeof config.http !== 'function') {
    warn('Apisdk: You should provide a "http" service, otherwise no request can be launched.')
    config.http = function(params) {
      return {
        then: function(callback) {
          callback(params);
          return this;
        }
      };
    };
  }
  // Check "promise" service
  if(typeof config.promise !== 'function') {
    warn('Apisdk: Strongly suggest to provide a "promise" service, otherwise the asynchronous parameter will not be supported.')
  }
  return new Part(config).loadRawTree(Part.listToRawTree(list));
};

umd('Apisdk', Apisdk);
umd('APISDK', Apisdk); <!-- Discarded, to be compatible with old version

/**/ }();
