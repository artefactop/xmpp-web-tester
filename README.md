# xmpp-web-tester
A tool for test your XMPP stanzas

Change la config for your server in xmpp_tester.js

```javascript
var BOSH_SERVICE = null; // example 'http://xmpp.mydomain:5280/http-bind'
var XMPP_DOMAIN = null; // example 'mydomain'
```

To execute

```go
go run server.go
```

Now go to `http://localhost:8080` and connect!