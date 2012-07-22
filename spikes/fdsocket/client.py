# http://www.velvetcache.org/2010/06/14/python-unix-sockets

import socket
import os, os.path

sockfile = "./communicate.sock"
 
print "Connecting..."

if os.path.exists( sockfile ):
  client = socket.socket( socket.AF_UNIX, socket.SOCK_STREAM )
  client.connect( sockfile )
  print "Ready."
  print "Ctrl-C to quit."
  print "Sending 'DONE' shuts down the server and quits."
  while True:
    try:
      x = raw_input( "> " )
      if "" != x:
        print "SEND:", x
        client.send( x )
        if "DONE" == x:
          print "Shutting down."
          break
    except KeyboardInterrupt, k:
      print "Shutting down."
  client.close()
else:
  print "Couldn't Connect!"

print "Done"
