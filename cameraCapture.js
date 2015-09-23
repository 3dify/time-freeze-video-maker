#!/usr/bin/env node

var cp = require('child_process');
var fs = require('fs');
var path = require('path');
var colors = require('colors');
var yargs = require('yargs');
var Player = require('player');
var config = require('./config');
require('stringformat').extendString();
var batchNumber = 0;
var player = new Player('finished.mp3');


var exitWithError = function(msg){
	process.stderr.write(msg.red+"\n");
	process.exit(1);
}

if( yargs.argv._.length != 1 ){
	exitWithError([
		'Incorrect arguments',
		'./cameraCapture.js {target_dir}'
	].join('\n'));
}

var command = "gphoto2";
try {
	var targetDir = fs.realpathSync(yargs.argv._[0]);
}
catch(e){
	exitWithError("Directory not found");
}
var processes = []; 
var shutdown = false;

var captureTethered = function(options){
	console.log("captureTethered",options);
	var processCompletePromise = new Promise(function(resolved,rejected){
		var port = options.port;
		var index = options.index.toString();
		while(index.length<3) index='0'+index;
		console.log("Camera found at port {0}".format(port.blue));
		var args = [
			'--port', port,
			'--capture-tethered',
			'--force-overwrite',
			'--no-keep',
			'--filename',index+'.jpg'
		];
		var p = cp.spawn(command,args, {cwd : getBatchDir(), stdio:['ignore','pipe','pipe'] });
		p.stdout.on('data',function(d){
			if(d.toString().indexOf("Saving file as")>=0){
				setTimeout(p.kill.bind(p),1000);
			}
			//console.log(port,d.toString().grey);
		});
		p.stderr.on('data',function(d){
			//console.log(port,d.toString().yellow);
		});
		p.on('close',function(code, signal){
			if( code > 0 ){ 
				if( shutdown ) return;
				console.log("gphoto2 ended unexpectedly for camera {0}".format(index).yellow);				
				rejected(code);
			}
			else resolved(options);
		});
		processes[options.index] = p;

	});

	return processCompletePromise;
}

var getCameraIndex = function(port){
	var args = ["--auto-detect"];
	var index = 0;
	var ordering = config.cameraOrder;

	var args = ["--port",port,"--get-config","/main/status/serialnumber"];

	console.log("Getting serialnumber for Camera at port {0}".format(port).grey);
	var stdout = cp.execSync(command +" "+ args.join(" ") );

	var serial=0;
	try {
		serial = parseInt( stdout.toString().match(/Current: ([0-9]+)/)[1],10 );
	}
	catch(e){
		throw new Error('Unexpected output from gphoto, bad format in serialnumber');
		process.exit(1);
	}
	index = ordering.indexOf(serial);

	return {port:port,index:parseInt(index)}
}

var findAllCameras = function(cb){
	var args = ["--auto-detect"];

	cp.exec(command +" "+ args.join(" "), function(err, stdout, stderr){
		var entries=stdout.toString().match(/usb:[0-9]+,[0-9]+/g) || [];
		if(err&&err.code==127){
			exitWithError("Command {0} not found".format(command))
		}
		var numCamerasFound = entries.length;
		var numCamerasExpected = config.video.numCameras;
		if( numCamerasExpected == numCamerasFound ){
			console.log("Found {0} cameras".format(numCamerasFound));
		}
		else {
			console.log("Warning: {0} cameras expected, {1} found".format(numCamerasExpected,numCamerasFound).red);
		}
		cb(null,entries);
	});
}

var sortByIndex = function(a,b){ return a.index - b.index };

var getBatchDir = function(){
	var b = batchNumber.toString();
	while( b.length < 3 ) b = "0"+b;
	return path.join(targetDir,b);
}

var tetherAllCameras = function(entries){	
	var batchDir;
	if(shutdown) return;

	//player.play();

	while(fs.existsSync(batchDir = getBatchDir())){
		batchNumber++;
	}
	console.log("tetherAllCameras "+batchDir);
	fs.mkdirSync(batchDir);
	if( entries.length > 0 ) Promise.all( entries.map(captureTethered) ).then(tetherAllCameras).catch(function(rejects){
		exitWithError("gphoto2 exited with bad status");
	});
	batchNumber++;
}

if(yargs.argv.getSettings){
	findAllCameras(function(error,entries){

	});
}
else {
	findAllCameras(function(error,entries){
		if(error) {
			throw error;
			process.exit(1);
		}
		processes = new Array(entries.length);
		tetherAllCameras(entries.map(getCameraIndex).sort(sortByIndex));
	});
}

process.on('SIGINT', function () {
	shutdown = true;
	processes.forEach(function(p){
		if( p ) p.kill();
	}); 	
});

