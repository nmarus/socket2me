'use strict';

var Socket2meClient = require('socket2me-client');
var util = require('util');
var _ = require('lodash');

// constructor
function Server() {
  this.routers = [];
}

Server.createServer = function(options) {
  var newServer = new Server();

  if(options && typeof options === 'object') {
    newServer.options = options;
  } else {
    newServer.options = {};
  }

  return newServer;
};

Server.prototype.listen = function(port, host, cb) {
  var self = this;

  // parse args
  var args = Array.prototype.slice.call(arguments);
  if(args.length === 0) {
    throw Error('no host specified');
  } else {
    cb = args.length > 0 && typeof args[args.length - 1] === 'function' ? args.pop() : null;
    host = args.length > 0 && typeof args[args.length - 1] === 'string' ? args.pop() : null;
  }
  if(!host) {
    throw Error('no host specified');
  }

  // connect to socket2me-server
  self.socket2me = new Socket2meClient(host);

  self.socket2me.on('connected', function() {
    self.url = self.socket2me.url;
    cb();
  });

  // define request handler
  self.socket2me.requestHandler(function(req) {

    var res = {};
    res.send = function() {};

    function end() {}

    function next() {
      if(found.length > 1) {
        found.shift().cb(req, res, next);
      } 
      else if(found.length > 0) {
        found.shift().cb(req, res, end);
      }
    }

    // find route that matches request
    var found = _.filter(self.routers, function(router) {
      var method = (req.method === router.method);

      var route = (req.params.route == router.route)
        || (req.params.route && router.route === '');

      var file = (req.params.file == router.file)
        || (req.params.file && router.file === '');

      return (method && route && file);
    });
    if(found.length > 0) {
      req.route = {};

      if(req.params.route && found[0].route && req.params.file) {
        req.route.path = util.format('/%s/%s', req.params.route, req.params.file);
      } 

      else if(req.params.route && found[0].file === '') {
        req.route.path = util.format('/%s/', req.params.route);
      } 

      else if(req.params.route) {
        req.route.path = util.format('/%s', req.params.route);
      } 

      else {
        req.route.path = '/';
      }
      
      req.method = found[0].method.toLowerCase();
      
      found.shift().cb(req, res, next);
    }
  });

};

Server.prototype._handle = function(method, router, cb) {
  var self = this;

  var route = null;
  var file = null;

  router = router.toLowerCase();
  router = router.split('/');


  // validate router string
  if(router.length > 3 || router.length < 2 || router[0] !== '') {
    throw new Error('router invalid');
  }

  // parse 'file' from router (/route/file)
  if(router.length === 3) {
    file = router[2];
  }

  // parse 'route' from router
  route = router[1];

  self.routers.push({
    method: method, 
    route: route, 
    file: file,
    cb: cb
  });
};

Server.prototype.get = function(router, cb) {
  this._handle('GET', router, cb);
};
Server.prototype.put = function(router, cb) {
  this._handle('PUT', router, cb);
};
Server.prototype.post = function(router, cb) {
  this._handle('POST', router, cb);
};
Server.prototype.del = function(router, cb) {
  this._handle('DELETE', router, cb);
};
Server.prototype.delete = function(router, cb) {
  this._handle('DELETE', router, cb);
};

module.exports = Server;
