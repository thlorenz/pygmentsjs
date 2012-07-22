var net = require('net')
  , log = require('npmlog')
  , sockfile = "/tmp/pygments_communicate.sock"
  ;

function request(req, respond) {
  var client = net.connect( { path: sockfile })
    , reqSent
    , lenSent
    , len
    , buf = ''
    ;

  client
    .on('connect', function () {
      log.info('client', 'client connected');
      var len = req.length.toString();

      // 1. Send request length to server this is first part of hand shake which server completes with OK
      client.write(len);
    })
    .on('data', function (data) {
      var msg = data.toString();

      log.info('client', 'Data: %s', msg);
      
      if (len) {
        // 4. Buffer all packets until we got entire response promised by the server
        buf += data;

        if (buf.length === len) client.end(); 
        
      } else if (reqSent) {
        // 3. After client request was sent, server will respond with the length of the message containing the processed request
        //    Client acknowledges that he got response length
        //    Note that we skip the 'request received ACK' here since we are not expecting to loose data while on the same machine
        len = parseInt(msg, 10);
        client.write('OK');
        
      } else  if (msg === 'OK') {
        // 2. Once server confirms that he got request length, we send request
        client.write(req);
        reqSent = true;

      } else {
        respond(new Error('Never got OK from server'));
      }
    })
    .on('error', function (err) {
      log.error('client', err);
      respond(err);
    })
    .on('end', function () {
      log.info('client', 'client disconnected');
      respond(null, buf.toString());
    })
    ;
}

request('test something ', function (err, res) {
  if (err) log.error('highlighter',  err); else log.info(res);
});

/*
for (var i = 0; i < 100; i++) {
  (function (i) {
    request('test something ' + i + ' ', function (err, res) {
      if (err) log.error('highlighter' + i,  err); else log.info(res);
    });
  }) (i)
}
*/



