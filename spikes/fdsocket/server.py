# http://www.velvetcache.org/2010/06/14/python-unix-sockets

import socket
import os, os.path
import time
 
sockfile = "./communicate.sock"

if os.path.exists( sockfile ):
  os.remove( sockfile )
 
print "Opening socket..."

server = socket.socket( socket.AF_UNIX, socket.SOCK_DGRAM )
server.bind(sockfile)
 
print "Listening..."
while True:
  datagram = server.recv( 1024 )
  if not datagram:
    break
  else:
    print "-" * 20
    print datagram
    if "DONE" == datagram:
      break
print "-" * 20
print "Shutting down..."

server.close()
os.remove( sockfile )

print "Done"
