import socket, string, os, shelve, random, time, csv, socketserver, http.server, base64
from _thread import *
from http.server import BaseHTTPRequestHandler, HTTPServer

ServerSocket = socket.socket()
host = '192.168.1.200'
port = 1233
wsport = 8080
ThreadCount = 0

dataRecv = {}

# --------------
# - Web Server - 
# --------------
class WebServer(BaseHTTPRequestHandler):
    def do_GET(self):
        disks = {}
        
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        for pc in dataRecv:
            data = dataRecv[pc].split("~")[1].split(",")
            self.wfile.write(bytes(f'<hr>{pc}<br><br>CPU Physical/Logical Cores: {data[1]}/{data[0]}<br>Current/Max Frequency: {data[2]}MHz / {data[3]}MHz<br>', "utf-8"))
            for i in range(4, int(data[0]) + 4):
                self.wfile.write(bytes(f'Core {str(i - 3)} Usage: {data[i]}%<br>', "utf-8"))
            self.wfile.write(bytes(f'<br>Total RAM: {round(int(data[4 + int(data[0])]) / 1073741824, 2)}GB<br>Available RAM: {round(int(data[5 + int(data[0])]) / 1073741824, 2)}GB<br>Used RAM: {round(int(data[6 + int(data[0])]) / 1073741824, 2)}GB<br>', "utf-8"))
            self.wfile.write(bytes(f'<br>Number of Disks: {data[7 + int(data[0])]}<br>', "utf-8"))
            
            startofDisk = 8 + int(data[0])
            numDisk = int(data[7 + int(data[0])])
            for i in range(startofDisk, startofDisk + numDisk):
                disks[i] = {}
                disks[i]['name'] = data[i]
            for i in range(startofDisk + numDisk, startofDisk + (numDisk*2)):
                disks[i - numDisk]['size'] = int(data[i])
            for i in range(startofDisk + (numDisk*2), startofDisk + (numDisk*3)):
                disks[i - (numDisk*2)]['used'] = int(data[i])
            for d in range(numDisk):
                for i in range(startofDisk + (numDisk*3) + (d*2), startofDisk + (numDisk*4) + (d*2)):
                    print(f'{startofDisk + d} {data[i]}')
            
            for d in disks:
                self.wfile.write(bytes(f'{disks[d]["name"]} {str(round(int(disks[d]["used"]) / 1073741824, 1))}GB / {str(round(int(disks[d]["size"]) / 1073741824, 1))}GB' + '<br>', "utf-8"))
                
            afterDisk = startofDisk + (numDisk * (3 + numDisk))
            
            self.wfile.write(bytes('<br>Hostname: ' + base64.b64decode(data[afterDisk].encode('ascii')).decode('ascii') + '<br>', "utf-8"))
            
        self.wfile.write(bytes("<script>setTimeout(function(){window.location.reload(1);}, 500);</script>", "utf-8"))

def webserver(port):
    webServer = HTTPServer(("", port), WebServer)
    webServer.serve_forever()

# ---------------
# - Data Server - 
# ---------------
def tagGen(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for _ in range(size))

def computer(tag = None):
    with shelve.open('computer') as db:
        if tag == None:
            tag = tagGen()
            db[tag] = {'name': 'newPC'}
            
        if not tag in db:
            returnVal = 'INVALIDTAG'
        else:
            returnVal = {'tag': tag, 'data': db[tag]}
            
        db.sync()
        db.close()
        return returnVal
        
def threaded_client(connection):
    connection.send(str.encode('ack'))
    tag = None
    
    data = connection.recv(512).decode('utf-8').replace('`', '')
    
    if data == 'needTag':
        newTag = computer()
        reply = newTag['tag']
        print("Issued new tag: " + newTag['tag'])
        tag = newTag['tag']
    else:
        entry = computer(data)
        if (entry == 'INVALIDTAG'):
            reply = 'INVALIDTAG'
        else:
            reply = data
            tag = data
        
    connection.sendall(str.encode(reply) + str.encode(((512 - len(reply)) * '`')))
    
    if (reply == 'INVALIDTAG'):
        exit()
    
    print("Connection recieved and verified from tag " + tag)
    
    while True:
        data = connection.recv(512).decode('utf-8').replace('`', '')
        if data == 'CLOSECONN':
            print("Got close request from tag " + tag + ", closing connection.")
            del dataRecv[tag]
            connection.close()
            exit()
        else:
            #handle data
            print("Got '" + data + "' from tag " + tag)
            dataRecv[tag] = data


# ----------
# - Driver - 
# ----------
try:
    ServerSocket.bind((host, port))
    print('Waiting for a Connection..')
    ServerSocket.listen(5)
except socket.error as e:
    print(str(e))
    
start_new_thread(webserver, (wsport, ))
while True:
    Client, address = ServerSocket.accept()
    start_new_thread(threaded_client, (Client, ))
    ThreadCount += 1
    
ServerSocket.close()