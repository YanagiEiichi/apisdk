void function() {

  // Path node internal class
  var Node = function(name, config) {
    if(config) this.config = config;
    this.push(name);
  };
  // To convert a API list to a raw tree struct
  Node.listToRawTree = function(list) {
    var root = {};
    var i, j, k, path, methods, name;
    for(i = 0; i < list.length; i++) {
      if(!/^(\S+)\s+\/(\S+)$/.test(list[i])) {
        throw new Error('What\'s the fucking api defintion "' + list[i] + '"?');
      }
      methods = RegExp.$1;
      path = RegExp.$2.split('/');
      for(k = root, j = 0; j < path.length; j++) {
        // Supported formats: {xxx} [xxx] (xxx) <xxx> :xxx *
        name = path[j].replace(/^(?:([{\[(<]).*\1|:[\w-]*|\*)$/, '#rawSubTree');
        k = k[name] = Object(k[name]);
      }
      k['#methods'] = ~methods.indexOf('*') ? [ 'GET', 'POST', 'PUT', 'DELETE', 'PATCH' ] : methods.match(/\w+/g);
    }
    return root;
  };
  // It's prototype is an array, every part of API path is an array item
  Node.prototype = [];
  // Return the actual API path
  Node.prototype.getPath = function() {
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
        return path.join('/');
      });
    } else {
      return result.join('/');
    }
  };
  // Create child node that inherit from current node
  Node.prototype.createChild = function(name) {
    var Node = function() {};
    Node.prototype = this;
    var node = new Node();
    node.push(name);
    return node;
  };
  // Create a callable HTTP method as property of current node
  Node.prototype.buildMethod = function(method) {
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
  Node.prototype.loadRawTree = function(rawTree) {
    var rawSubTree = rawTree['#rawSubTree'] || {};
    var methods = rawTree['#methods'] || [];
    var handler = function(name) {
      return handler[name] = this.createChild(name).loadRawTree(rawSubTree);
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
    return new Node(config.host, config).loadRawTree(Node.listToRawTree(list));
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

