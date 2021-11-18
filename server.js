var net = require('net');
const cjson = require('compressed-json');
const http = require("http");

var PCs = {};
var tempData = {};

const host = '0.0.0.0';
const port = 8000;
const socketPort = 8124;

/**
 * from mpen on StackOverflow
 * https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string
 */
function humanFileSize(bytes, si=false, dp=1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si 
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10**dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


  return bytes.toFixed(dp) + ' ' + units[u];
}

const iterate = function(obj, add) {
	var ret = "<ul>";
	
	ret += "<li>" + add + ": ";
	if (typeof obj === 'object' && obj !== null) {
		Object.keys(obj).forEach(o => {
			ret += iterate(obj[o], o);
		});
	} else {
		ret += obj;
	}
	ret += "</li>";
	
	/*
	if (add === "mem") {
		ret += "<canvas id='memchart'></canvas>" + makeChartHTML([12, 11], ["10", "9"], "bar", "memchart");
	}
	*/
	
	ret += "</ul>";
	return ret;
};

var rgbarr = [];
var steps = 4;
var thing = 255/steps;
for (var i = 1; i < steps + 1; i++) {
  for (var ii = 1; ii < steps + 1; ii++) {
    for (var iii = 1; iii < steps + 1; iii++) {
      rgbarr.push('rgba(' + thing*i + ', ' + thing*ii + ', ' + thing*iii + ', 1)');
    }
  }
}

const requestListener = function (req, res) {
	console.log(req.url);
	
	if (req.url === "/") {
		res.writeHead(200);
		res.write("<html><script src='https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js'></script><script src='https://cdn.jsdelivr.net/npm/chart.js@3.5.0/dist/chart.min.js'></script><body>");
		
		Object.keys(PCs).forEach(o => {
			//res.write(iterate(PCs[o], o));
		});
		
		//setTimeout(function() {window.location.reload(1);}, 2000);
		res.write(`<script>
			var apidata = "";
			function updateAPI() {
				const apireq = new XMLHttpRequest();
				const url = '/api';
				apireq.open("GET", url);
				apireq.send();
				
				apireq.onreadystatechange = function() {
					if (this.readyState == 4 && this.status == 200) {
						apidata = JSON.parse(apireq.responseText);
					}
				}
			}
			updateAPI();
		</script>`);
		
		setTimeout(function(){
			var i = 0;
			Object.keys(PCs).forEach(o => {
				if ("dynamic" in PCs[o]) {
					res.write("<div style='display:inline-block;border:1px solid black;border-radius:5px;'>Computer " + String(i) + "<br>" + PCs[o]["static"]["cpu"]["manufacturer"] + " " + PCs[o]["static"]["cpu"]["brand"] + "<br><span id='ram" + String(i) + "'></span><br>");
					res.write("<div style='display:inline-block;position: relative; height:400px; width:800px;'><canvas id='memchart" + String(i) + "'></canvas></div></canvas><script>var times" + String(i) + " = apidata['" + o + "'].times;var memset" + String(i) + " = apidata['" + o + "'].memusage;var ctx" + String(i) + " = document.getElementById('memchart" + String(i) + "').getContext('2d');const data" + String(i) + " = {labels: times" + String(i) + ",datasets: memset" + String(i) + "};const config" + String(i) + " = {type: 'line',data: data" + String(i) + ",options: {scales: {Percent: {type: 'linear',max: 100, min: 0, display: true,position: 'left'}}}};var chart" + String(i) + " = new Chart(ctx" + String(i) + ", config" + String(i) + ");</script>");
					res.write("<div style='display:inline-block;position: relative; height:400px; width:800px;'><canvas id='cpuchart" + String(i) + "'></canvas></div></canvas><script>var cpudatasets" + String(i) + " = apidata['" + o + "'].cpuusage;console.log(cpudatasets" + String(i) + "[0].data);var cpuctx" + String(i) + " = document.getElementById('cpuchart" + String(i) + "').getContext('2d');const cpudata" + String(i) + " = {labels: times" + String(i) + ",datasets: cpudatasets" + String(i) + "};const configcpu" + String(i) + " = {type: 'line',data: cpudata" + String(i) + ",options: {scales: {Percent: {type: 'linear',max: 100, min: 0, display: true,position: 'left'}}}};var cpuchart" + String(i) + " = new Chart(cpuctx" + String(i) + ", configcpu" + String(i) + ");</script>");
					res.write(`
					<script>
						Chart.defaults.animation.duration = 0
						setInterval(function() {
							axios.get('/api').then(res => {
								chart` + String(i) + `.data.labels = res.data['` + o + `'].times;
								cpuchart` + String(i) + `.data.labels = res.data['` + o + `'].times;
								
								chart` + String(i) + `.data.datasets = res.data['` + o + `'].memusage;
								cpuchart` + String(i) + `.data.datasets = res.data['` + o + `'].cpuusage;
								
								chart` + String(i) + `.update();
								cpuchart` + String(i) + `.update();
								
								document.getElementById('ram` + String(i) + `').innerHTML = ((res.data['` + o + `'].ramusage / res.data['` + o + `'].ramtotal) * 100).toFixed(1) + '% (' + res.data['` + o + `'].ramusage.toFixed(2) + 'GB / ' + res.data['` + o + `'].ramtotal.toFixed(2) + 'GB)';
							});
						}, 1000);
					</script>`);
					res.write("</div>");
					
					i = i + 1;
				}
			});
			
			
			res.write("</body></html>");
			res.end();
		}, 500);
	} else if (req.url === "/api") {
		res.writeHead(200);
		
		output = {};
		
		Object.keys(PCs).forEach(o => {
			if ("dynamic" in PCs[o]) {
				if (!(o in output)) {
					output[o] = {};
				}
				output[o]["cputhreads"] = PCs[o].static.cpu.cores;
				output[o]["ramusage"] = PCs[o].dynamic[PCs[o].dynamic.length - 1].mem.used / 1073741824;
				output[o]["ramtotal"] = PCs[o].dynamic[PCs[o].dynamic.length - 1].mem.total / 1073741824;
		
				var cpuusages = [];
				var s = 0;
				PCs[o].dynamic.forEach(oo => {
					var core = 0;
					oo.cpu.load.cpus.forEach(ooo => {
						if (!(core in cpuusages)) {
							cpuusages[core] = Array(60 - PCs[o].dynamic.length).fill(0);
						}
						
						cpuusages[core].unshift(ooo.load);
						core++;
					});
					s++;
				});
				
				var cpuDatasets = [];
				for (var ii = cpuusages.length; ii > 0; ii--) {
					cpuDatasets.push({label: 'CPU ' + ii + ' Usage',yAxisID: 'Percent',data: cpuusages[ii - 1], borderColor: rgbarr[ii-1]});
				};
				
				output[o]['cpuusage'] = cpuDatasets;
				
				ram = [];
				memtotal = 0;
				PCs[o].dynamic.forEach(oo => {
					ram.push(oo.mem.used / 1073741824);
					memtotal = oo.mem.total / 1073741824;
				});
				
				times = Array.from({length:60},(v,k)=>k*2+2);
				mempercent = Array(60 - ram.length).fill(0);
				for (var ii = 0; ii < ram.length; ii++) {					
					mempercent.unshift(100 * (ram[ii] / memtotal));
				}
				
				output[o]['memusage'] = [{label: 'Memory Usage (GB)', yAxisID: 'Percent', borderColor: 'rgba(0, 128, 128, 1)', data: mempercent}];
				output[o]['times'] = times;
			}
		});
				
		res.write(JSON.stringify(output));
		res.end();
	} else {
		res.writeHead(404);
		res.end();
	}
};

var dataServer = net.createServer(function(c) {
	console.log(c.remoteAddress + ':' + c.remotePort + ' - CONNECTED');
	c.on('end', function() {
		console.log(c.remoteAddress + ':' + c.remotePort + ' - DISCONNECTED');
		delete PCs[c.remoteAddress]
	});
	c.on('error', function(e) {
		console.log(e);
	});
	c.on('data', function(d) {
		if (!(c.remoteAddress in tempData)) {
			tempData[c.remoteAddress] = "";
		}
		tempData[c.remoteAddress] += d.toString();
		if (d.toString().substr(-1) == "*") {
			var json = cjson.decompress(JSON.parse(tempData[c.remoteAddress].substring(0, tempData[c.remoteAddress].length - 1)));
			console.log(c.remoteAddress + ' - ' + json["type"]);
						
			if (!([c.remoteAddress] in PCs)) {
				PCs[c.remoteAddress] = {};
			}
			
			if (json["type"] === "static") {
				PCs[c.remoteAddress].static = json.data;
			} else if (json["type"] === "dynamic") {			
				if (!("dynamic" in PCs[c.remoteAddress])) {
					PCs[c.remoteAddress].dynamic = [];
				}
				
				PCs[c.remoteAddress].dynamic.push(json.data);
				
				if (PCs[c.remoteAddress].dynamic.length > 60) {
					PCs[c.remoteAddress].dynamic.shift();
				}
			}
			
			tempData[c.remoteAddress] = "";
		}
	});
	
	//Initial connect message
	//c.write('ACK');
});

const webServer = http.createServer(requestListener);
webServer.listen(port, host, () => {
    console.log(`webServer is running on http://${host}:${port}`);
});
dataServer.listen(socketPort, function() {
	console.log('dataServer started on port ' + socketPort + '!');
});