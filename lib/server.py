import sys
import os

import socket

from logger import get_logger

log = get_logger()

sockfile = "/tmp/pygments_communicate.sock"

if os.path.exists(sockfile): os.remove(sockfile)

try:
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.bind(sockfile)
    sock.listen(100)
except Exception as err:
    print >> sys.stderr, err.__str__()
    exit(1)


log.info('Pytments server listening ...')

while True:
    conn, addr = sock.accept()

    log.debug('Accepted connection')

    try:

        # 1. client send the length of the request to follow
        data = conn.recv(1024)
        msg_len = int(data)

        # Acknowledge that we got the request length
        conn.send('OK')

        # 2. Wait for client request
        msg = conn.recv(msg_len)
        print "Message: %s" % msg
        # May ack here, but for now we keep it simple

        # 3. Process the request
        res = msg.upper() + msg.upper()

        # 4. Tell client length of response
        res_len = len(res)
        conn.send(res_len.__str__())

        # 5. Wait for client OK, acknowledging he got response length and then send response
        ok = conn.recv(2)
        if not (ok == 'OK'): print >> sys.stderr, 'Did not get expected OK from client'
        else: conn.send(res)

    except Exception as err:
        print >> sys.stderr, err.__str__()
    finally:
        conn.close()


