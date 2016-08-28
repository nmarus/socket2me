# Socket2me (beta)
Socket2me is a client/server framework. The
[client](https://github.com/nmarus/socket2me/blob/master/client/README.md)
serves as an interface to the Server API to easily embed the ability to receive
inbound internet requests to applications that do not have direct inbound
internet connectivity. If you are just stumbling across this project, it is
probably easier to start by looking at the client setup.

### Topology
The Socket2me client sits on a network that does not have direct inbound
internet access. The Client initiates an outbound  connection to the server in
order to obtain an internet reachable URL. This URL can then be used by the client
to receive inbound internet requests.

socket2me-client --> || nat || --> socket2me-server <-- inbound request

## API Reference for the Socket2Me Server
It is easiest to get started with one of the clients, however, if those do not
meet your needs you can interface directly with a Socket2Me Server. The
Socket2Me server utilized a simple REST API for the generation and refreshing of
tokens which are needed in order to receive proxied requests. Once the token has
been generated, the Socket2Me Server utilizes the socket.io framework for the
bidirectional communication between the client and server.

### Token Management

##### (get) /new
Creates new client token. Token expires after 6 hours if not refreshed. When
the token expires, the client is disconnected.

###### Returns:
* `200` : token

##### (get) /refresh/`token`
Refreshes token. Must be called before token expires.

###### Returns:
* `200` : OK
* `500` : token not found

### Dynamic Routes

##### (get|put|post|del) /go/`token`
##### (get|put|post|del) /go/`token`/*

###### Returns:
* `200` : OK
* `500` : token not found
* `XXX` : Can vary on response from client

Forwards request to client and returns client response to the request.

### Socket-io Interface

Once you have a Socket2Me Server token, you can use the socket-io client library to connect.

##### Node JS Example:

```js
var io = require('socket.io-client');

var server = 'https://mysocketserver.com';
var token = 'mytoken';

var socket = io(server + '/' + token);

// socket events
socket.on('connect', function() {
  console.log('client connected with token "%s"', token);

  socket.on('request', function(req, respond) {
    // process request object
    console.dir(req);

    // respond(status, body, headers)
    respond(200, 'Hello World!', {"X-Test": "Hello World"});
  });
});
```
