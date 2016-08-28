'use strict';

var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var request = require('request-promise');
var util = require('util');
var io = require('socket.io-client');
var _ = require('lodash');

function Socket2meClient(socketServer) {
  EventEmitter.call(this);

  if(typeof socketServer !== 'string') {
    throw new Error('missing required option socketServer');
  }

  this.socketServer = socketServer;
  this.token = null;
  this.refreshTimer = 6*60*60*1000;

  // interval for token refresh
  this.refreshInterval = null;

  // default request options
  this.requestOptions = {
    baseUrl: this.socketServer,
    json: true,
    timeout: 20000
  }

  // default client function
  this.clientfn = (request, respond) => {
    console.log('request handler not defined, dumping values to console...');
    console.dir(request);
    respond(200, 'OK');
  };

  // connect to socket server
  this.connect();

  // start interval
  this.refreshIntervalInit();
}
util.inherits(Socket2meClient, EventEmitter);

Socket2meClient.prototype.getToken = function(token) {
  var token = _.clone(this.requestOptions);
  token.url = '/new';
  return request(token)
    .then(t => {
      this.token = t;
      return Promise.resolve(t);
    })
    .catch(err => {
      return Promise.reject(new Error('unable to connect to socket server'));
    });
};

Socket2meClient.prototype.getSocket = function() {
  var socket = io(this.socketServer + '/' + this.token);
  socket.io.reconnection(true);
  socket.io.reconnectionAttempts(15);
  socket.io.reconnectionDelay(2000);
  socket.io.reconnectionDelayMax(10000);
  socket.io.timeout(120*60*1000);
  return Promise.resolve(socket);
};

Socket2meClient.prototype.initSocket = function(socket) {
  socket.on('connect', () => {
    console.log('client connected with token "%s"', this.token);
    this.emit('connected', this.socketServer + '/go/' + this.token);
  });

  socket.on('error', err => {
    console.log('error attempting to reconnect with token "%s"', this.token);
    this.refreshToken()
      .catch(err => {
        console.log('client could not refresh token "%s"', this.token);
        socket.disconnect(true);
        setTimeout(() => {
          this.connect();
        }, 15000);
      });
  });

  socket.on('reconnecting', attempt => {
    console.log('attempting to reconnect with token "%s" (attempt #%s)', this.token, attempt);
  });

  socket.on('disconnect', () => {
    console.log('client disconnected with token "%s"', this.token);
    this.emit('disconnected');
    socket.disconnect(true);
    setTimeout(() => {
      this.connect();
    }, 15000);
  });

  socket.on('request', (req, respond) => {
    this.clientfn(req, respond);
  });
};

Socket2meClient.prototype.refreshToken = function() {
  var refresh = _.clone(this.requestOptions);
  refresh.url = '/refresh/' + this.token;
  return request(refresh)
    .then(() => {
      console.log('client refreshed with token "%s"', this.token);
    });
};

Socket2meClient.prototype.refreshIntervalInit = function() {
  this.refreshInterval = setInterval(() => {
    this.refreshToken().catch(err => {
      console.log('client could not refresh token "%s"', this.token);
    });
  }, this.refreshTimer);
};

Socket2meClient.prototype.refreshIntervalReset = function() {
  if(this.refreshInterval) {
    clearInterval(this.refreshInterval);
  }
  return this.refreshIntervalInit();
};

Socket2meClient.prototype.connect = function(token) {
  if(token) {
    return this.getSocket()
      .then(socket => this.initSocket(socket))
      .catch(err => console.log(err.stack));
  } else {
    return this.getToken()
      .then(token => this.getSocket())
      .then(socket => this.initSocket(socket))
      .catch(err => console.log(err.stack));
  }
};

Socket2meClient.prototype.requestHandler = function(fn) {
  if(typeof fn === 'function') {
    this.clientfn = fn;
  } else {
    throw new Error('requestHandler must be passsed a function');
  }
};

module.exports = Socket2meClient;
