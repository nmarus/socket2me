'use strict';

var moment = require('moment');
var debug = require('debug')('socket-server');
var _ = require('lodash');

// restify
var Restify = require('restify');
var server = Restify.createServer();
server.use(Restify.bodyParser({
  'mapParams': true,
  'mapFiles': false,
  'overrideParams': true
}));
server.use(Restify.queryParser());

// socket.io
var io = require('socket.io')(server.server);

// settings
var port = 80;
var tokenMinutes = 24 * 60;

// authorized clients
var clients = [];

// generate random token
function newToken(len) {
  if(!len) len = 8;

  function gen() {
    return Math.random().toString(36).slice(2);
  }

  function expand(r) { return gen() + r }

  var r = gen();
  while(r.length < len) { r = expand(r) } 

  // return token @ length
  return r.slice(0,len);
}

function refreshToken(token) {
  // find token
  var found = _.find(clients, {token: token});

  if(found) {
    found.expires = moment().add(tokenMinutes, 'minutes');

    debug('token refreshed: %s', found.token);
    
    return true;
  } else {
    return false;
  }
}

function newClient() {
  // gen token
  var token = newToken(24);

  // define expire time
  var expires = moment().add(tokenMinutes, 'minutes');

  // create namespace for token and capture socket
  var nsp = io.of('/' + token);
  nsp.on('connection', function(socket) {
    debug('client connected usung token: %s', token);

    // map socket to token
    var found = _.find(clients, {name: nsp.name});

    if(found) {
      found.socket = socket;
    } else {
      socket.disconnect(true);
      delete io.nsps[nsp.name];
    }

    // on client disconnect
    socket.on('disconnect', function(){
      debug('client disconnected');
    });

    // on client error
    socket.on('error', function(data){
      console.log('error');
    });

  });

  var client = {
    token: token,
    expires: expires, 
    name: nsp.name, 
    socket: null
  };

  debug('token requested: %s', token);
  
  clients.push(client);
  return client;
}

function removeClient(client) {

  // disconnect socket
  if(client.socket) client.socket.disconnect(true);

  // delete socket
  delete io.nsps['/' + client.token];

  // remove from clients array
  clients = _.differenceBy(clients, [client], 'token');

  debug('client removed');
}

// forward request
function forwardReq(req, res, next) {
  // if token in API call is missing...
  if(!req.params.token) {
    res.send(400, 'invalid api call');
    return next();
  }

  // find client by token
  var client = _.find(clients, {token: req.params.token});
  // if client token not found
  if(!client) {
    // send token not found
    res.send(404, 'token not found');
    return next();
  }

  // define socket
  var socket = client.socket;

  // if client is not connected...
  if(!socket) {
    // send client not connected error
    res.send(400, 'client not connected');
    return next();
  } 

  // else client is connected...

  // parse req object
  req = {
    headers: req.headers,
    params: req.params,
    body: req.body
  };

  // forward request to client...
  socket.emit('request', req);

  // respomd
  res.send(200);
  next(); 
}

// api socket forwarding routes
server.get('/v1/go/:token', forwardReq);
server.post('/v1/go/:token', forwardReq);

// get new token
server.get('/v1/new', function(req, res, next) {
  // add client
  var client = newClient();

  //respond with token
  res.send(200, client.token);

  next();
});

// refresh expiration on existing token
server.get('/v1/refresh/:token', function(req, res, next) {
  // if token is missing or invalid
  if(!req.params.token) {
    res.send(400, 'invalid api call');
    next();
  } else {
    // refresh token
    if(refreshToken(req.params.token)) {
      res.send(200, 'OK');
      next();
    } else {
      res.send(404, 'token not found');
      next();
    }
  }
});

// check for expired clients in array every 10 seconds
setInterval(function() {
  // find expired clients
  var expiredClients = _.filter(clients, function(token) {
    return token.expires < moment();
  });
  
  // remove expired clients
  _.forEach(expiredClients, function(expired) {
    debug('token expired: %s', expired.token);
    removeClient(expired);
  });

}, 10000);

// start server
server.listen(port);

