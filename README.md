# Socket2me
Socket2me is a client/server framework for the forwarding of internet requests to application that do not have inbound internet connectivity. This does not support replying to those requests with anything other than a 200/OK. The primary use case is for relaying webhooks to services that do not have inbound internet access (i.e behind a NAT firewall). However, many other use cases are possible when there is only a need for one way exchange of data. For example, web forms, image uploading, etc.

###### Topology
socket2me-client --> || nat || --> socket2me-server <-- inbound get/post request

#### Features / About
The server is not configured with any authentication. This would be trivial to add if needed.

Socket2me Server requires the client to initiate a connection via API call in order to get a generated unique token. Once this token is recieved, it will expire within 24 hours if not refreshed.

The token is then used to attach the  client to a socket.io port namespace which is in turn used as a transport mechanizm to relay requests back to the client. The mapping of request to client is accompished my mapping the token to the socket session to the unique URL.

* Powered by Restify
* Rate Limiter
* Body parser
* Query string parser
* Token generator and expirer

#### Server Install
This can run as a simple nodejs app, or in Docker with the provided Dockerfile.

###### Node JS
After cloning the repo, modify any parameers that need to be changed in regard service port, rate limiter, etc. Then...

```bash
$ cd socket2me/server/app
$ npm install
$ node .
```

###### Docker
After cloning the repo, modify any parameers that need to be changed in regard service port, rate limiter, etc. Then...

```bash
$ cd socket2me/server/app
$ docker build -t socket2me .
$ docker run -d -it -p 80:80 --name socket2me socket2me
```

#### Client Install
Currently the only client that is available is for Node JS. Others may be available soon. 

*See [socket2me-client](https://github.com/nmarus/socket2me/blob/master/client-node/README.md)*
