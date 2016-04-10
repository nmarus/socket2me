# socket2me-client
Client for [socket2me](https://github.com/nmarus/socket2me)

* Creates a connection to a socket2me server.
* Automates the retrieval of the token
* Automates the refresh of the token every 120 seconds

#### Install

```bash
$ npm install socket2me-client --save
```

### Properties

#### socket2me#url
This is the generated URL for using with callbacks. It will look something like `http://servername/go/jdfdjhfjdkhfajddjfadh`

### Functions

#### socket2me#listen(fn:Function)
Defines function to process rests for this client received from the server. The request object contains the following three objects:

* `req.headers` : An object including the headers received at server
* `req.params` : An ibject wi the parsed parsed paramenters from url query
  strings, body json, and any form URL encoded or multipart encoded body values.
* `req.body` : raw contents of the request body. used for manual parsing or
  grabbing of binary data

##### Example:
```js
socket2me.listen(function(req) {
  console.log('request: %s', JSON.stringify(req));
});
```

### Events

#### socket2me#on(string:Event, fn:Function)

#### 'connected'
This is triggered when the socket2me client has connected to a socker2me server.

#### 'disconnected'
This is triggered when the socket2me client has disconnected from a socker2me
server.

#### 'error', function(err){}
This is triggered when the socket2me client has connected to a socker2me server.

##### Example Program Structure:
```js
var Socket2meClient = require('socket2me-client')

// Socket host
var host = 'http://mysocketserver.com';

// Create new socket2me client and connect
var socket2me = new Socket2meClient(host);

// Connected event (fires shortly after Socket2meClient is instantiated)
socket2me.on('connected', function() {

  // The connected event will trigger when a connection is made AND will
  // retrigger if the connection bounces.

  // Token will remain the same as long as the expire interval does not lapse
  // during the disconnection.

  // Log value of socket2me.url to console
  console.log('socket server url: %s', socket2me.url);
  // Outputs [http://servername/go/generatedtoken] At this point, run your
  // functions that (re)create your webhooks with your API.

});

// disconnected event
socket2me.on('disconnected', function() {
  console.log('socket server disconnected');
});

// Define function that is triggered when request is made to the generated url
socket2me.listen(processReq);

function processReq(req) {
  // log request to console
  console.log('request: %s', JSON.stringify(req));

  // log a variable that might have been passed
  console.log(req.params.data.personEmail);

  // Run your functions that process the incoming request.

  // No need to process a response as the spark2me-server reposnds 200/OK for
  // all inbound requests if the client is connected.
}

```
