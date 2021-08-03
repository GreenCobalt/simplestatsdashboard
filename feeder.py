import socket, string, os, shelve, time, psutil

ClientSocket = socket.socket()
host = '192.168.1.200'
port = 1233

tag = None

print('Waiting for connection')
try:
    ClientSocket.connect((host, port))
except socket.error as e:
    print(str(e))

with shelve.open('feederDB') as db:
    hasTag = 'tag' in db
    tag = db['tag'] if hasTag else None
    
    print(f"Connected to server, " + ("requesting new tag." if not hasTag else "verifying tag with server."))
    
    res = ClientSocket.recv(512)
    if res.decode('utf-8') == 'ack':
        res = str.encode(tag) if hasTag else str.encode('needTag')
        ClientSocket.send(res + str.encode(((512 - len(res)) * '-')))
    else:
        print("Invalid connection reply from server.")
        exit()
    res = ClientSocket.recv(512)
    newTag = res.decode('utf-8').replace('-', '')
    if not hasTag:
        print("Recieved new tag: " + newTag)
        db['tag'] = newTag
        tag = newTag
    else:
        if newTag == 'INVALIDTAG':
            print("Server does not recognize stored tag. Please reinstall.")
            exit()
        if not newTag == tag:
            print("Failed to match tags with server.")
            exit()
        else:
            print("Tag verified: " + newTag)
        
    db.sync()
    db.close()

try:
    delayBtwnSend = 1
    while True:
        stTime = time.time()
        psHdd = psutil.disk_io_counters(perdisk=True)
        hddStats = [[d[2], d[3]] for d in psHdd.values()]
        if not 'oldhddStats' in globals():
            oldhddStats = hddStats
        
        mem = psutil.virtual_memory()
        disk = psutil.disk_partitions()
        
        message = f'{tag}:{psutil.cpu_count()},{psutil.cpu_count(logical=False)},{psutil.cpu_freq().current},{psutil.cpu_freq().max},{str(psutil.cpu_percent(interval=delayBtwnSend,percpu=True)).replace("[", "").replace("]", "")},{mem.total},{mem.available},{mem.used},\
{len(disk)},' + str([d.mountpoint for d in disk]).replace("[", "").replace("]", "").replace("'", "").replace("\\\\", "\\").replace(" ", "") + ',' + str([psutil.disk_usage(d.mountpoint).total for d in disk]).replace("[", "").replace("]", "").replace("'", "").replace(" ", "")\
 + ',' + str([psutil.disk_usage(d.mountpoint).used for d in disk]).replace("[", "").replace("]", "").replace("'", "").replace(" ", "") + ',' + str([[hddStats[i][0] - oldhddStats[i][0], hddStats[i][1] - oldhddStats[i][1]] for i in range(len(psHdd))]).replace("[", "").replace("]", "").replace("'", "").replace(" ", "")
        print("Sending '" + message)
        res = str.encode(message)
        ClientSocket.send(res + str.encode(((512 - len(res)) * '-')))
        
        oldhddStats = hddStats
        
        tookTime = time.time() - stTime
        time.sleep(1.25 - tookTime)
except KeyboardInterrupt:
    res = str.encode("CLOSECONN")
    ClientSocket.send(res + str.encode(((512 - len(res)) * '-')))
    ClientSocket.close()