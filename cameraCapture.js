#!/usr/bin/env node

var cp = require('child_process');
var fs = require('fs');
var path = require('path');
var colors = require('colors');
var yargs = require('yargs').boolean('loadconfig');
var config = require('./config');
require('stringformat').extendString();
var batchNumber = 0;


var exitWithError = function(msg){
	process.stderr.write(msg.red+"\n");
	process.exit(1);
}

if( yargs.argv._.length != 1 ){
	exitWithError([
		'Incorrect arguments',
		'./cameraCapture.js --saveconfig {port|index} {target_file}',
		'./cameraCapture.js --loadconfig {target_file}',
		'./cameraCapture.js {target_dir}'
	].join('\n'));
}

var command = "gphoto2";
var processes = []; 
var shutdown = false;

// Implement bash string escaping.
var safePattern =    /^[a-z0-9_\/\-.,?:@#%^+=\[\]]*$/i;
var safeishPattern = /^[a-z0-9_\/\-.,?:@#%^+=\[\]{}|&()<>; *']*$/i;
function bashEscape(arg) {
  // These don't need quoting
  if (safePattern.test(arg)) return arg;

  // These are fine wrapped in double quotes using weak escaping.
  if (safeishPattern.test(arg)) return '"' + arg + '"';

  // Otherwise use strong escaping with single quotes
  return "'" + arg.replace(/'+/g, function (val) {
    // But we need to interpolate single quotes efficiently

    // One or two can simply be '\'' -> ' or '\'\'' -> ''
    if (val.length < 3) return "'" + val.replace(/'/g, "\\'") + "'";

    // But more in a row, it's better to wrap in double quotes '"'''''"' -> '''''
    return "'\"" + val + "\"'";

  }) + "'";
}

var captureTethered = function(options){
	if( options.process ) {
		options.process.removeAllListeners();
		options.process.stdout.removeAllListeners();
		if( options.process.connected ) options.process.kill();
	}

	console.log("captureTethered port={0} index={1}".format(options.port,options.index));
	var processCompletePromise = new Promise(function(resolved,rejected){
		var port = options.port;
		var index = options.index.toString();
		while(index.length<3) index='0'+index;
		console.log("Camera found at port {0}".format(port.blue));
		var args = [
			'--port', port,
			'--wait-event', 1,
			'--force-overwrite',
			'--no-keep',
			'--filename',index+'.jpg'
		];
		var p = cp.spawn(command,args, {cwd : getBatchDir(), stdio:['ignore','pipe','pipe'] });

		/*
		p.stdout.on('data',function(d){
			if((d||"").toString().indexOf("Saving file as")>=0){
				console.log("{0} captured".format(index));
				//setTimeout(p.kill.bind(p),1000);
				resolved(options);

			}
			else {
				console.log("Unknown message from {0}".format(index));
				console.log((d||"").toString().grey);
			}
		});
		*/
		
		p.stderr.on('data',function(d){
			console.log(port,d.toString().yellow);
		});
		
		p.on('close',function(code, signal){
			if( code != 0 ){ 
				if( shutdown ) return;
				console.log("gphoto2 ended unexpectedly for camera {0}".format(index).yellow);				
				rejected(code);

			}
			else {
				resolved(options);
			}
		});
		options.process = processes[options.index] = p;

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
	console.log(index,serial);

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


	console.log("Ready to capture".green);
	while(fs.existsSync(batchDir = getBatchDir())){
		batchNumber++;
	}
	console.log("tetherAllCameras "+batchDir);
	fs.mkdirSync(batchDir);
	if( entries.length > 0 ) Promise.all( entries.map(captureTethered) ).then(tetherAllCameras).catch(function(reason){
		if( reason instanceof Error ) throw reason;
		if( typeof(reason) === 'number' ) exitWithError("gphoto2 exited with bad status {0}".format(reason));
	});
	batchNumber++;
}

if(yargs.argv.saveconfig){
	var id = yargs.argv.saveconfig.toString();
	var file = yargs.argv._[0];

	if( fs.existsSync(file) ){
		exitWithError("File {0} already exists".format(file));
	}

	findAllCameras(function(error,entries){
		var port;
		var index;
		if( id.match(/^usb/) ){
			port = id;
		}
		else {
			index = parseInt(id,10);
		}

		var cameraInfo = entries.map(getCameraIndex).filter(function(entry){ return entry.port===port || entry.index===index })[0];
		
		var args =[
			'--port', cameraInfo.port,
			'--list-config'
		];
		var stdout = cp.execSync(command +" "+ args.join(" ") );
		settings = stdout.toString().match(/[\/a-z0-9]+capturesettings[\/\-A-Za-z0-9]+/g) || [];
		args = [
					'--port', cameraInfo.port,
		];
		args = args.concat( settings.map(function(setting){
			return '--get-config '+setting;
		}));
		stdout = cp.execSync(command+" "+args.join(" ")).toString();
		//Couldn't find value character range [\/.0-9A-Za-z\-\ ]
		var settings = stdout.match(/Current: .+$/mg).map(function(match,i){
			match = match.toString();
			return { key:settings[i], value:match.replace(/Current: /,'') };
		});
		fs.writeFileSync(file,JSON.stringify(settings));

	});
}
else if(yargs.argv.loadconfig){
	var file = yargs.argv._[0];

	if( !fs.existsSync(file) ){
		exitWithError("File {0} not found".format(file));
	}
	settings = fs.readFileSync(file);
	try {
		settings = JSON.parse(settings);
		if( !( settings instanceof Array ) ){
			throw new TypeError("Array expected");
		}
	}
	catch(e){
		exitWithError("Invalid settings data in file {0}".format(file));
	}

	findAllCameras(function(error,entries){

		if( error ){
			throw error;
		}
		entries.map(getCameraIndex).forEach(function(options){
			var port = options.port;
			var index = options.index;
			var args = ['--port',port].concat(settings.map(function(entry){ return "--set-config "+entry.key+"="+bashEscape(entry.value); }));
			console.log("Setting config options for {0}".format(index).blue);
			cp.execSync(command+" "+args.join(' '));
		});
	});
}
else {
	try {
	var targetDir = fs.realpathSync(yargs.argv._[0]);
	}
	catch(e){
		exitWithError("Directory not found");
	}

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

