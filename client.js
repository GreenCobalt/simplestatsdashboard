const si = require('systeminformation');
var net = require('net');
const cjson = require('compressed-json')

var client = net.connect({host: '192.168.1.200', port: 8124},
    function() {
		console.log('Connected to server on client port ' + client.localPort + '!\n----------');
		
		//initial connect message
		//client.write('Hello');
	}
);
client.on('data', function(data) {
  console.log(data.toString());
  //client.end();
});
client.on('end', function() {
  console.log('----------\nDisconnected from server!');
});

process.on('SIGINT', function() {
    client.end();
});

const sendDynamic = async() => {
	startTime = new Date();
	var dta = await si.getDynamicData();
	
	var obj = {}
	obj.type = "dynamic";
	obj.data = {};
	obj.data.cpu = {};
	obj.data.disks = {};
	obj.data.network = {};
	
	obj.data.time = dta.time;
	obj.data.cpu.speed = dta.cpuCurrentSpeed;
	obj.data.cpu.load = dta.currentLoad;
	obj.data.temps = dta.temp;
	obj.data.graphics = dta.graphics;
	obj.data.mem = dta.mem;
	obj.data.disks.usage = dta.fsSize;
	obj.data.network.interfaces = await si.networkInterfaces();
	obj.data.network.defaultInterface = await si.networkInterfaceDefault();
	obj.data.network.stats = dta.networkStats;
	obj.data.battery = dta.battery;
	//obj.data.services = dta.services('mysql, apache2');
	client.write(JSON.stringify(cjson.compress(obj)) + "*");
		
	endTime = new Date();
	
	console.log("Sending dynamic data, took " + (endTime - startTime) + "ms");
	
	setTimeout(() => {
		sendDynamic();
	}, 2000 - (endTime - startTime));
};

si.getStaticData(function(i) {
	console.log("Sending static data.");
	var obj = {}
	obj["type"] = "static";
	obj["data"] = i;
	delete obj.data.graphics;
	client.write(JSON.stringify(cjson.compress(obj)) + "*");
	
	sendDynamic();
});
