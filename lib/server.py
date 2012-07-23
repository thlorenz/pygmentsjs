import sys
import os

import socket
import json

script_path = os.path.dirname( os.path.realpath( __file__ ) )
pygments_path = os.path.join(script_path, '../../readarepo-zip/3rd/pygments/pygments/')
sys.path.append(pygments_path)

import pygmentizer


from logger import get_logger


log = get_logger()

sockfile = "/tmp/pygments_communicate.sock"


def process_request (json_string):
    req = json.loads(json_string)

    task = req['task']

    print 'processing task: %s' % task
    if task == 'pygmentize':
        args = req['args']
        code = req['code']
        log.debug('pygmentizing %s ' % args)

        (exit_code, highlighted, err) = pygmentizer.process(['server.py'] + args, code)
        log.debug('pygmentizer exited with: %d' % exit_code)

        if (err):
          log.error(err)
        return 'done'



def main ():
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
        log.debug(conn)

        try:

            # 1. client send the length of the request to follow
            data = conn.recv(1024)
            req_len = int(data)

            # Acknowledge that we got the request length
            conn.send('OK')

            # 2. Wait for client request
            req = conn.recv(req_len)
            print "Request: %s" % req
            # May ack here, but for now we keep it simple

            # 3. Process the request
            res = process_request(req)

            # 4. Tell client length of response
            res_len = len(res)
            conn.send(res_len.__str__())

            # 5. Wait for client OK, acknowledging he got response length and then send response
            ok = conn.recv(2)
            if not (ok == 'OK'): print >> sys.stderr, 'Did not get expected OK from client'
            else: conn.send(res)

        except Exception as err:
            print >> sys.stderr, err.__str__()
            try: conn.send('SERVER ERROR: ' + err.__str__()) 
            except Exception as err: pass
        finally:
            conn.close()

    
main()

