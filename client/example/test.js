var Socket2meClient = require('socket2me-client');

// Create new socket2me client and connect
var socket2me = new Socket2meClient('http://socket.bothub.io');

// Connected event(fires shortly after Socket2meClient is instantiated)
socket2me.on('connected', function(url) {

  // The connected event will trigger when a connection is made AND will
  // re-trigger if the connection bounces. The token will remain the same as
  // long as your application does not restart or the server disconnects.
  // When this happens, a new token is retrieved and the "connected" event will
  // re-fire to provide an updated URL.

  // The URL value provided as part of this event is the url that the socket2me
  // server will be now listening on. GET, PUT, POST, DELETE requests to this
  // URL will be forwarded to the client and trigger the function defined by the
  // requestHandler() function.

  console.log('socket server url: %s', url);
});

// Define a function that is triggered when a request is made to the generated
// url. This function has 2 arguments. The request is a object containing the
// data forwarded from a request to the Socket2Me Server
socket2me.requestHandler(function(request, respond) {

  // log inbound request object to console
  console.dir(request);

  // Optionally, you can provide a response through the use of the respond
  // callback to the incoming proxied request.

  // The respond function "body" and "headers" variables are optional.
  // Note that if the respond() function is not called within 5 seconds of
  // receiving the request, a default 200/OK is sent. If the respond() function
  // is executed after this window, it is ignored.

  // respond(body, headers);
  respond({'text': 'this is a test'}, {'X-Test': 'It Works'});
}
