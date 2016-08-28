# Socket2me-client
This is a Node JS Client for the [Socket2Me](https://github.com/nmarus/socket2me) Server.

#### Installation
The Socket2me-client can be installed via NPM.

```bash
npm install socket2me-client --save
```

## Example App
Be sure to review the example folder of this repository for more details on
setting this up.

```js
var Socket2meClient = require('socket2me-client');
var socket2me = new Socket2meClient('https://mysocketserver.com');

socket2me.on('connected', function(url) {
  console.log('socket server url: %s', url);
});

socket2me.requestHandler(function(request, respond) {
  console.dir(request);
  respond(200,'Hello World!');
}
```

## Function Reference

#### Request Object
The request object contains the following keys:
* `headers:object` - This is an object that contains the header values of the inbound request.
* `method:string` - This is the method that the inbound request used.
* `url:string` - This is the portion of the Socket2Me Server URL that follows the token.
  For example if the url was called at http://mysocketserver.com/go/[token]/help/me?fname=bob&lname=smith, this will be `'/help/me'`
* `query:object` - This is an object that includes and URL Query string assignments.
  For example if the url was called at http://mysocketserver.com/go/[token]/help/me?fname=bob&lname=smith, this will be `{ "fname": "bob", "lname": "smith" }`
* `body` - This is the content of the body. If JSON or a URL Encoded Body was detected, this will be an object.

#### Socket2me#requestHandler(request:obj, respond:fn([status], [body], [headers]){});
Defines a function that is called when a request is received.
* `request:object` - *See Request Object above*
* `respond:function` - This is a callback like function that can be used to
  respond to the request. It is important to note that you must call this within
  5 seconds of receiving the request for it to be valid. Otherwise, the
  Socket2Me Server will respond with a simple 200/OK. This is not to be confused
  with the response object. This function has 3 arguments it will accept and all
  are optional.
  * `status:number` - Specify the status code used in the response to the
    request. *Defaults to 200 if not specified*
  * `body` - Specify the contents of the body in the response to the request.
    *Defaults to 'OK' if not specified*
  * `headers:object` - Specify any additional headers to supply in the response
    to the request. *Defaults to {} if not specified*

**Example 1**
```js
socket2me.requestHandler(function(request, respond) {
  if(request.query.name === 'bob') {
    respond(200, 'Hello Bob!');
  } else {
    respond(400, request.query.name + ' not found!')
  }
});
```

**Example 2**
```js
socket2me.requestHandler(function(request, respond) {
  if(request.method === 'POST') {
    console.log(request.query);
    respond();
  }
});
```

## Events

* `connected` - Emitted when client has connected with server. Provides parameter
  `url` which is the URL that the server generated.
* `disconnected` - Emitted when the client is disconnected from the server.

## License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
