# socket2me-server
Server side of socket2me.

## API calls
The following API calls are available on the server:

##### get http://server/v1/new
Creates new client token. Token expires after 24hours if not refreshed. When token expires, client is disconnected.

###### Returns:
* 200 : `token`

##### get http://server/v1/refresh/`token`
Refreshes token. Must be called before token expires.

###### Returns:
* 200 : `OK`
* 404 : not found

##### get http://server/v1/go/`token`
Forwards request to client and returns ok to the request.

###### Returns:
* 200 : `OK`

##### post http://server/v1/go/`token`
Forwards request to client and returns ok to the request.

###### Returns:
* 200 : `OK`

## Socket.io
Each token binds to a socket.io namespace. Only one client can be connected to a namespace/token at any time. If a second attempt to connect is made, the first connection is disconnected.

* socket server/namespace : http://server/`token`

###### Socket Events
* socket.on('request', function(req));

#### Request Object

The request body (if json), url query strings, and form URL encoded body values are parsed into `req.params`.

The request object includes:
* req.headers
* req.params
* req.body

###### Example

If a call (get) is made to: "http://server/v1/go/mrs6wpu2mawk0swpja1c3dit?somevar1=somevalue1", the client will receive the following request object in socket event:

```js
{
  "headers":{
    "host":"socket.bothub.io",
    "connection":"close",
    "x-real-ip":"5.5.5.5",
    "x-forwarded-for":"5.5.5.5",
    "x-forwarded-proto":"http",
    "accept-encoding":"gzip, deflate",
    "accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "user-agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/601.5.17 (KHTML, like Gecko) Version/9.1 Safari/601.5.17",
    "accept-language":"en-us","cache-control":"max-age=0"
  },
  "params":{
    "token":"mrs6wpu2mawk0swpja1c3dit",
    "somevar1":"somevalaue1"
  }
}
```
