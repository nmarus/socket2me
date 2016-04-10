# socket2me-wrapper

Attempts to wrap the socket2me-client in a format familiar to Node http services like Express and Restify. This is not a 1:1 feature match for those services...yet...

#### Example:
```js
var Server = require('socket2me-wrapper');

var server = Server.createServer();

server.listen('mysocketserver.com', function() {
  console.log('Server now listening at: %s', server.url);   
});

server.get('/', function(req, res, next) {
  console.log(req.headers);
  console.log(req.body);
  res.send(200);
  next();  
});
```
