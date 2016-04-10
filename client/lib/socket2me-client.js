'use strict';

var EventEmitter = require('events').EventEmitter;
var request = require('request');
var debug = require('debug')('socket2me-client');
var util = require('util');
var io = require('socket.io-client');

function Socket2meClient(socketServer) {
  var self = this;

  // enable event emitter
  EventEmitter.call(self);

  self.clientfn;

  // request options
  self.options = {
    baseUrl: socketServer,
    json: true
  };

  // get socket and listen for events
  self.getSocket(function(err, socket, url, token) {
    if(!err) {

      self.url = url;

      socket.on('connect', function(){
        debug('client connected');
        self.emit('connected');
      });

      socket.on('error', function(data){
        debug('error');
      });

      socket.on('disconnect', function(){
        self.emit('disconnected');
        debug('client disconnected');
      });

      socket.on('request', function(req) {
        self.emit('request', req);
        // if client function defined
        if(typeof self.clientfn === 'function') {
          self.clientfn(req);
        }
      });

      setInterval(function() {
        self.refreshToken(token);
      }, 120 * 1000);

    } else {
      throw new Error('could not get socket');
    }
  });

}
util.inherits(Socket2meClient, EventEmitter);

Socket2meClient.prototype.getSocket = function(cb) {
  var self = this;

  self.options.url = '/new';

  // request token
  request(self.options, function(err, res, body) {
    if (!err && res.statusCode == 200) {
      var token = body;
      var ioNsp = self.options.baseUrl + '/' + token;
      var url = self.options.baseUrl + '/go/' + token;

      //create socket
      var socket = io(ioNsp);

      cb(null, socket, url, token);
    } else {
      cb(new Error('socket could not be created'));
    }
  });
};

Socket2meClient.prototype.refreshToken = function(token, cb) {
  var self = this;

  self.options.url = '/refresh/' + token;

  // request token refresh from api
  request(self.options, function(err, res, body) {
    if (!err && res.statusCode == 200) {
      cb ? cb(null) : null;
    } else {
      cb ? cb(new Err('socket could not be refreshed')) : null;
    }
  });
};

Socket2meClient.prototype.listen = function(fn) {
  var self = this;

  self.clientfn = fn;
};

module.exports = Socket2meClient;
