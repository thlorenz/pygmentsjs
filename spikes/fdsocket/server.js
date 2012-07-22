var net = require('net')
  , log = require('npmlog')
  , sockfile = './communicate.sock'
  ;

var server = net.createServer();

server
  .on('connection', function (client) {
    log.info('server', 'server connected');
    client.on('end', function () {
      log.info('server', 'client disconnected');
    });
    client.write('welcome\r\n');
    client.pipe(client);
  })
  .listen(sockfile, function () {
    log.info('server', 'server bound');
  });


