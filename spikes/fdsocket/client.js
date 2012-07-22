var net = require('net')
  , log = require('npmlog')
  , sockfile = './communicate.sock'
  ;

var client = net.connect( { path: sockfile });

client
  .on('connect', function () {
    log.info('client', 'client connected');
    client.write('hello server');
  })
  .on('data', function (data) {
    log.info('client', 'Data: %s', data.toString());
    client.end(); 
  })
  .on('error', function (err) {
    log.error('client', err);
  })
  .on('end', function () {
    log.info('client', 'client disconnected');
  })
  ;
