# socket2me
Socket2me is a client/server framework for the forwarding of internet requests to application that do not have inbound internet connectivity. This does not support replying to those requests with anything other than a 200/OK. The primary use case is for relaying webhooks to services that do not have inbound internet access (i.e behind a NAT firewall).

###### Topology
socket2me-client --> || nat || --> socket2me-server <-- inbound get/post request
