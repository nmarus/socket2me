# socket2me-client
Client for [socket2me](https://github.com/nmarus/socket2me)

##### Example:
```js
var Socket2meClient = require('socket2me-client')

// socket host
var host = 'mysocketserver.com';

// create new socket2me client and connect
var socket2me = new Socket2meClient(host);

// get generated url
socket2me.on('connected', function() {
  console.log('socket server url: %s', socket2me.callbackUrl);
});

// define function that is triggered when request is made to generated url
socket2me.listen(function(req) {
  console.log('request: %s', JSON.stringify(req));
});
```

