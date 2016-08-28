'use strict';

var bodyParser = require('body-parser');
var Promise = require('bluebird');
var Limiter = require('express-rate-limit');
var moment = require('moment');
var Redis = require('redis');
var path = require('path');
var uuid = require('uuid');
var _ = require('lodash');

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// promisfy redis
Promise.promisifyAll(Redis.RedisClient.prototype);
Promise.promisifyAll(Redis.Multi.prototype)

var redis = Redis.createClient({ url: process.env.REDIS_URL });
var expireSeconds = process.env.TOKEN_EXPIRE_SECONDS || 6 * 60 * 60; // 6 hour default

// configure limiter
var throttleIntervalMs = process.env.THROTTLE_INTERVAL_MS || 1000;
var throttleIntervalMax = process.env.THROTTLE_INTERVAL_MAX || 200;
var throttleIntervalBurstMax = process.env.THROTTLE_INTERVAL_BURST_MAX || 400;
var throttleIntervalBurstDelay = Math.floor((throttleIntervalMs - throttleIntervalMax) / 2);

var limiter = new Limiter({
  windowMs: throttleIntervalMs,
  max: throttleIntervalBurstMax,
  delayAfter: throttleIntervalMax,
  delayMs: throttleIntervalBurstDelay
});

// audit tokens to remove stale nsp
setInterval(() => {
  Promise.resolve(_.map(io.nsps, nsp => nsp.name.slice(1)))
    .each(token => {
      return verifyToken(token)
        .then(exists => {
          if(!exists) removeNSP(token);
          return Promise.resolve(true);
        });
    });
}, Math.floor(expireSeconds * 0.10));

// configure express server
app.enable('trust proxy');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(limiter);

// start express server
server.listen(process.env.PORT || 3000);

// gen random token
function genToken() {
  return new Buffer(uuid.v4()).toString('base64');
};

// verify client by token
function verifyToken(token) {
  if(typeof token === 'string') {
    return redis.existsAsync(token)
      .then(exists => {
        if(exists === 1) {
          return Promise.resolve(true);
        } else {
          removeNSP(token);
          return Promise.resolve(false);
        }
      });
  } else {
    return Promise.reject(new Error('invalid token'));
  }
}

// get client by token
function getClient(token) {
  return verifyToken(token)
    .then(exists => {
      if(exists) return redis.hgetallAsync(token);
      else return Promise.reject(new Error('invalid token'));
    });
}

// add client
function addClient(token, client) {
  if(typeof token === 'string' && typeof client === 'object') {
    return redis.hmsetAsync(token, client)
      .then(() => redis.expireAsync(token, expireSeconds));
  } else {
    return Promise.reject(new Error('invalid token or client object'));
  }
}

// update socket id for client
function updateClientSocketId(token, id) {
  if(typeof token === 'string' && typeof id === 'string') {
    return redis.hsetAsync(token, 'socketId', id);
  } else {
    return Promise.reject(new Error('invalid token or socket id'));
  }
}

// clear socket id for client
function clearClientSocketId(token) {
  return verifyToken(token)
    .then(exists => {
      if(exists) return updateClientSocketId(token, '');
      else return Promise.resolve(false);
    });
}

// refresh client by token
function refreshClient(token) {
  return getClient(token)
    .then(client => {
      return redis.expireAsync(token, expireSeconds)
        .then(() => Promise.resolve(client));
    });
}

// remove a namespace and disconnect associated sockets
function removeNSP(token) {
  if(typeof token === 'string' && token.length > 0) {
    // remove nsp listener
    var nsp = getNSP(token);
    if(nsp) {
      console.log('removing stale namespace for token "%s"', token);
      // get sockets attached to namespace
      var sockets = Object.keys(nsp.connected);

      // disconnect sockets
      sockets.forEach(socketId => {
        if(nsp.sockets[socketId]) {
          nsp.sockets[socketId].disconnect(true);
        }
      });

      // remove all event listeners
      nsp.removeAllListeners();

      // remove namespace
      delete io.nsps[nsp.name];
    }
    return token;
  } else {
    return false;
  }
}

// add a new namespace
function addNSP(token) {
  if(typeof token === 'string') {
    var nsp = io.of('/' + token)
    nsp.on('connection', connectSocket);
    return nsp;
  } else {
    return false;
  }
}

// get name space by token
function getNSP(token) {
  return _.find(io.nsps, nsp => ('/' + token === nsp.name));
}

// get socket by token and socket id
function getSocketById(token, id) {
  return getClient(token)
    .then(client => {
      var nsp = getNSP(token);
      if(!nsp) nsp = addNSP(token);
      return Promise.resolve(nsp.sockets[nsp.name + '#' + id]);
    });
}

// get socket object for a token
function getSocketByToken(token) {
  return getClient(token)
    .then(client => {
      var nsp = getNSP(token);
      if(!nsp) nsp = addNSP(token);
      return Promise.resolve(nsp.sockets[nsp.name + '#' + client.socketId]);
    });
}

// when socket is connected...
function connectSocket(socket) {
  var token = socket.nsp.name.slice(1);
  var socketId = socket.id.split('#')[1];

  // get token
  getClient(token)

    // get client socket id associated with token
    .then(client => {

      // if socket id is empty...
      if(client.socketId === '') {
        // update client socket id
        return updateClientSocketId(token, socketId);
      }

      // else socket id is stale...
      else {
        return getSocketById(token, client.socketId)
          //remove old socket
          .then(oldSocket => disconnectSocket(oldSocket))

          // update client socket id
          .then(() => updateClientSocketId(token, socketId));
      }
    })

    // init new socket
    .then(() => {
      console.log('client connected with token "%s"', token);
      socket.on('disconnect', function() {
        console.log('client disconnected with token "%s"', token);
        clearClientSocketId(token);
      });
      return Promise.resolve(socket);
    })

    // error
    .catch(err => console.log(err.message));
}

// disconnect a socket
function disconnectSocket(socket) {
  if(socket && typeof socket.disconnect === 'function') {
    socket.disconnect(true);
    return true;
  } else {
    return false;
  }
}

// handle a incming request and forward to a connected client socket
function forwardRequest(req, res, next) {
  var token = req.params.token;
  var url = req.params['0'];
  var params = _.omit(_.clone(req.params), '0', 'token');
  var request = {
    headers: req.headers,
    method: req.method,
    url: url,
    query: req.query,
    body: req.body
  }

  // get socket by token
  getSocketByToken(token)
    .then(socket => {
      // if connected
      if(socket) {

        var _respondRecieved = false;
        var _respondTimedout = false;

        socket.emit('request', request, function(status, response, headers) {
          _respondRecieved = true;

          // prevent late respond from attempting to resend...
          if(!_respondTimedout) {
            // parse args
            var args = Array.prototype.slice.call(arguments);
            status = args.length > 0 && typeof args[0] === 'number' ? args.shift() : 200;
            response = args.length > 0 ? args.shift() : 'OK';
            headers = args.length > 0 && typeof args[0] === 'object' ? args.shift() : {};

            // add Socket2Me Header
            headers['X-Provided-By'] = 'Socket2Me';

            // set headers
            res.set(headers);

            // build body and send
            res.status(status).send(response);
            next();
          }
        });

        // ensure client provides response
        setTimeout(() => {
          if(!_respondRecieved) {
            _respondTimedout = true;

            // add Socket2Me Header
            var headers = {};
            headers['X-Provided-By'] = 'Socket2Me';

            // set headers
            res.set(headers);

            // build body and send
            res.status(200).send('OK');
            next();
          }
        }, 5000);

      } else {
        res.status(500).send({ Error: 'client not connected'});
        next();
      }
    })
    .catch(err => {
      res.status(500).send({ Error: err.message });
      next();
    });
}

// ****************************** express routes *******************************

// route to get new token
app.get('/new', function(req, res, next) {
  var token = genToken();
  var nsp = addNSP(token);

  var client = {
    ip: req.ip,
    created: moment().unix(),
    socketId: ''
  }

  addClient(token, client)
    .then(() => {
      res.status(200).send(JSON.stringify(token));
      next();
    })
    .catch(err => {
      res.status(500).send({ Error: err.message });
      next();
    });
});

// route to get refresh token
app.get('/refresh/:token', function(req, res, next) {
  var token = req.params.token;
  refreshClient(token)
    .then(client => {
      // validate nsp
      var nsp = getNSP(token);
      if(!nsp) nsp = addNSP(token);

      console.log('client refreshed with token "%s"', token);
      res.status(200).send('OK');
      next();
    })
    .catch(err => {
      res.status(500).send({ Error: err.message});
      next();
    });
});

// route forwarders
app.get('/go/:token', forwardRequest);
app.put('/go/:token', forwardRequest);
app.post('/go/:token', forwardRequest);
app.delete('/go/:token', forwardRequest);
app.get('/go/:token/*', forwardRequest);
app.put('/go/:token/*', forwardRequest);
app.post('/go/:token/*', forwardRequest);
app.delete('/go/:token/*', forwardRequest);
