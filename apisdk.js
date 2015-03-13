void function() {

  // Use to convert a API list to a tree struct
  var buildTree = function(list) {
    var root = {};
    var i, j, temp, path, name, item;
    for(i = 0; i < list.length; i++) {
      item = list[i].split(/\s+\//);
      temp = root;
      path = item[1].split('/');
      for(j = 0; j < path.length; j++) {
        name = path[j].replace(/^\{.*\}$/, '{}');
        temp = temp[name] = Object(temp[name]);
      }
      if(!('' in temp)) temp[''] = [];
      temp[''].push(item[0]);
    }
    return root;
  };

  // Convert any to string
  var resolveString = function(what, config) {
    return new config.promise(function(resolve) {
      if(typeof what === 'function') {
         resolve(resolveThenable(what(), index));
      } else if(what && typeof what.then === 'function') {
        what.then(function(arg) {
          resolve(resolveThenable(what));
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
    var count = this.length;
    if(count === 0) return '';
    var result = [];
    for(var i = 0; i < this.length; i++) {
      result.push(resolveString(this[i], config));
    }
    return config.promise.all(result).then(function(path) {
      return path.join('/');
    });
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
      return node.getPath(config).then(function(path) {
        return config.http({ method: method, url: path, data: data }); 
      });
    };
  };

  // Tree walker
  var walker = function(subtree, node, config) {
    var chains = subtree['{}'];
    var current = chains ? function(name) {
      return current[name] = walker(chains, node.createChild(name), config);
    } : {};
    for(var name in subtree) {
      if(!/^\w+$/.test(name)) continue;
      current[name] = walker(subtree[name], node.createChild(name), config);
    }
    var methods = subtree[''];
    if(methods) {
      for(var i in methods) {
        current[methods[i].toLowerCase()] = node.buildMethod(methods[i], config);
      }
    }
    return current;
  }

  // Interface
  interface = function(list, config) {
    config = Object(config);
    config.host = String(config.host || '/api'); 
    if(!config.http) throw new Error("You should set a 'http' to config.");
    if(!config.promise) throw new Error("You should set a 'promise' to config.");
    return walker(buildTree(list), new Node(config.host), config);
  };

  // Match loaders
  if(this.define && this.define.amd) {
    // For AMD
    define(function() { return interface; }); 
  } else if(this.angular) {
    // For angular
    angular.module('APISDK', []).factory('APISDK', function() { return interface; });
  } else {
    // For global
    APISDK = interface;
  }

}();

