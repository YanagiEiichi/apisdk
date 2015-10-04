void function() {

  // Supported methods
  var METHODS = [ 'GET', 'POST', 'PUT', 'DELETE', 'PATCH' ];

  // Use to convert a API list to a tree struct
  var buildTree = function(list) {
    var root = {};
    var i, j, k, path, methods, name;
    for(i = 0; i < list.length; i++) {
      if(!/^(\S+)\s+\/(\S+)$/.test(list[i])) {
        throw new Error('What\'s the fucking api defintion "' + list[i] + '"?');
      }
      methods = RegExp.$1;
      path = RegExp.$2.split('/');
      for(k = root, j = 0; j < path.length; j++) {
        name = path[j].replace(/^(?:([{<(\[]).*\1|:[\w-]*)$/, '#chains');
        k = k[name] = Object(k[name]);
      }
      k['#methods'] = ~methods.indexOf('*') ? METHODS : methods.match(/\w+/g);
    }
    return root;
  };

  // Convert callable to normal
  var resolveCallable = function(what) {
    if(typeof what !== 'function') return what;
    return resolveCallable(what());
  };

  // Convert any to string
  var resolveString = function(what, config) {
    return new config.promise(function(resolve) {
      if(typeof what === 'function') {
        resolveString(what(), config).then(function(e){
          resolve(e);
        });
      } else if(what && typeof what.then === 'function') {
        what.then(function(what) {
          resolveString(what, config).then(function(e) {
            resolve(e);
          });
        });
      } else {
        resolve(what + '');
      }
    });
  };

  // Path node internal constructor
  var Node = function(name) {
    this.push(name);
  };
  Node.prototype = [];
  Node.prototype.toString = function() {
    return Array.prototype.join.call(this, '/');
  };
  Node.prototype.getPath = function(config) {
    var result = [];
    for(var i = 0; i < this.length; i++) {
      result[i] = resolveCallable(this[i]);
    }
    if(config.promise) {
      return config.promise.all(result).then(function(path) {
        return path.join('/');
      });
    } else {
      return result.join('/');
    }
  };
  Node.prototype.createChild = function(name) {
    var Node = function() {};
    Node.prototype = this;
    var node = new Node();
    node.push(name);
    return node;
  };
  Node.prototype.buildMethod = function(method, config) {
    var node = this;
    return function(data) {
      var what = node.getPath(config);
      var launch = function(path) {
        return config.http({ method: method, url: path, data: data });
      };
      if(typeof what === 'string') {
        return launch(what);
      } else {
        return what.then(launch);
      }
    };
  };

  // Tree walker
  var walker = function(subtree, node, config) {
    var chains = subtree['#chains'] || {};
    var methods = subtree['#methods'] || [];
    var current = function(name) {
      return current[name] = walker(chains, node.createChild(name), config);
    };
    for(var name in subtree) {
      if(name.charAt(0) === '#') continue;
      current[name] = walker(subtree[name], node.createChild(name), config);
    }
    for(var i = 0; i < methods.length; i++) {
      current[methods[i].toLowerCase()] = node.buildMethod(methods[i], config);
    }
    return current;
  }

  // Interface
  var APISDK = function(list, config) {
    config = Object(config);
    config.promise = config.promise || window.Promise;
    config.host = String(config.host || '/api'); 
    // Check "http" service
    if(typeof config.http !== 'function') {
      warn('APISDK: You should provide a "http" service, otherwise no request can be launched.')
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
      warn('APISDK: Strongly suggest to provide a "promise" service, otherwise the asynchronous parameter will not be supported.')
    }
    return walker(buildTree(list || []), new Node(config.host), config);
  };

  // Send a warning
  var warn = function(message) {
    window.console && console.warn && console.warn(message);
  };

  // Match loaders
  if(this.define && this.define.amd) {
    // For AMD
    define('APISDK', function() { return APISDK; });
  } else if(this.angular) {
    // For angular
    angular.module('APISDK', []).factory('APISDK', function() { return APISDK; });
  } else {
    // For global
    new Function('return this')().APISDK = APISDK;
  }

}();

