var net = require('net')
  , log = require('npmlog')
  , sockfile = "/tmp/pygments_communicate.sock"
  ;

log.level = 'silly';

function request(req, respond) {
  var client = net.connect( { path: sockfile })
    , reqString = JSON.stringify(req)
    , reqSent
    , lenSent
    , len
    , buf = ''
    ;

  if (log.level === 'silly') {
    client
      .on('data', function (data) {
        log.silly('server', data.toString());
      });
  }

  client
    .on('error', function (err) {
      log.error('client', err);
      respond(err);
    })
    .on('end', function () {
      log.silly('client', 'client disconnected');
      respond(null, buf.toString());
    });

  // Protocol
  // Note that we skip the 'request received ACK' step
  client
    .on('connect', function () {
      log.silly('client', 'client connected');

      // 1. Send request length to server this is first part of hand shake which server completes with OK
      var len = reqString.length.toString();
      client.write(len);
    })
      // 2. Wait for OK from server
    .once('data', function (data) {
      
      if (data.toString() !== 'OK') {
        respond(new Error('Never got OK from server'));
        return;
      }
      
      // 3. Once server confirms that he got request length, we send request
      client.write(reqString);

      // 4. Wait for response length
      client.once('data', function (data) {
        
      // 5.Acknowledge that we got response length
        len = parseInt(data.toString(), 10);
        client.write('OK');

      // 6. Wait for response packets and buffer them until we got entire response
        client.on('data', function (data) {
          buf += data;
          if (buf.length === len) client.end(); 
        });
      });
    })
    ;
}

/**
 * Calls pygmentize via python server with the given args and calls back with result.
 * @param {String, Array} args      Arguments to be passed to pygmentize
 * @param {Function}      callback  function (err, result) that gets called when either an error occurs or pygmentize returned a result
 */
function pygmentize(args, callback) {
  if (!Array.isArray(args)) {
    args = args
      .split(' ')
      .filter(function (arg) {
        return arg.trim().length > 0;
      });
  }

  var pygmentizeReq = {
      task: 'pygmentize'
    , args: args
  };

  request(pygmentizeReq, callback);
}

module.exports = {
  pygmentize: pygmentize
};

pygmentize('-f html -o ./client.html -g ' + __filename,  function (err, res) {
  if (err) log.error('highlighter',  err); else log.info(res);
});






