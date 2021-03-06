var child_process =  require('child_process')
  , exec          =  child_process.exec
  , spawn         =  child_process.spawn
  , net           =  require('net')
  , log           =  require('npmlog')
  , path          =  require('path')
  , server        =  path.join(__dirname, 'server.py')
  , sockfile      =  '/tmp/pygments_communicate.sock'
  ;

log.level = 'silly';

function execute (command, args, callback) {
  var errors  =  []
    , infos   =  []
    , spawned =  spawn (command, args)
    , signaledStart = false
    ;

  spawned.stdout.on('data', function(data) {
    var msg = data.toString();
    if (msg.length > 0) { 
      log.verbose(command, msg);
      if (!signaledStart) {
        callback(null, msg);
        signaledStart = true;
      }
    }
  });
  spawned.stderr.on('data', function(data) {
    log.error(command, data.toString());
  });
  spawned.on('exit', function(code) {
    callback(null, 'exited with ' + code);
  });
}

function request(req, respond) {
  var reqString = JSON.stringify(req)
    , len
    , buf = ''
    , states = [ 'WaitOK', 'WaitLen', 'Recv' ]
    , state
    ;

  var client = net.connect( { path: sockfile });

  client
    .on('error', function (err) {
      log.error('client', err);
      respond(err);
    })
    .once('end', function () {
      log.silly('client', 'client disconnected');

      if (buf.length > 0) {
        result = JSON.parse(buf.toString());
        log.silly('client', 'request exited with code: %s', result.exitCode);
        log.silly('client', result);
        respond(result.err, result.res);
      }
    })
    .on('connect', function () {
      log.silly('client', 'client connected');

      // Send request length to server this is first part of hand shake which server completes with OK
      var len = reqString.length.toString();
      client.write(len);
      state = 0;
    })
    .on('data', function (data) {

      log.silly('client', data.toString());
      if(states[state] === 'WaitOK') {
        if (data.toString() !== 'OK') {
          respond(new Error('Never got OK from server'));
          return;
        }
        state++;
        
        // Once server confirms that he got request length, we send request
        client.write(reqString);
      } else if (states[state] === 'WaitLen') {
        // Acknowledge that we got response length
        len = parseInt(data.toString(), 10);
        client.write('OK');
        state++;
      } else if (states[state] === 'Recv') {
        // Buffer response packets until we got entire response
        buf += data;

        log.silly('client', 'Got %d/%d', buf.length, len);

        if (buf.length === len) client.end();
      }
    })
    ;
}

/* Starts the pygments python server */
function start (cb) {
  execute('python', ['server.py'], function (err, res) {
    if (err) { 
      log.error(err);
      cb(err);
      return;
    }
    //log.verbose('server', res);
    cb(null, true);
  });
}

/* Stops the pygments python server, by sending the stop signal */
function stop () {
  var stopReq = { task: 'stop' };
  request(stopReq,  function (err, res) {
    if    (err) log.error('server', err); 
    else  log.verbose('server', res);
  });
}

/**
 * Calls pygmentize via python server with the given args and calls back with result.
 * @param {String, Array} args      Arguments to be passed to pygmentize
 * @param {Function}      callback  function (err, result) that gets called when either an error occurs or pygmentize returned a result
 */
function pygmentize(args, code, callback) {
  if (!Array.isArray(args)) {
    args = args
      .split(' ')
      .filter(function (arg) {
        return arg.trim().length > 0;
      });
  }

  if (typeof code !== 'string') {
      callback = code;
      code = '';
  }

  var pygmentizeReq = {
      task: 'pygmentize'
    , args: args
    , code: code
  };

  request(pygmentizeReq, callback);
}

module.exports = {
    start      :  start
  , stop       :  stop
  , sockfile   :  sockfile
  , pygmentize :  pygmentize
};


start(function (err, ready) {
  if (err || !ready) return;
    pygmentize('-f html -g ', 'var a = 3;',  function (err, res) {
      if (err) log.error('highlighter',  err); else log.info(res.length);
      stop();
    });
   /* 
  var count = 10
    , proc = 0;
  for (var i = 0; i < count; i++) {

    pygmentize('-f html -g '+ __filename ,  function (err, res) {
      if (err) log.error('highlighter',  err); else log.info(res.length);
      if (++proc === count) stop();
    });
  }
  */
});
