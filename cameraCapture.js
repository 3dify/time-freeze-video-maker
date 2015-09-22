#!/usr/bin/env node

var cp = require('child_process');
var fs = require('fs');
var path = require('path');
var colors = require('colors');
var yargs = require('yargs');

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
var targetDir = fs.realpathSync(yargs.argv._[0]);
console.log( targetDir );

var captureTethered = function(port){
	console.log(port);
	var args = [
		'--port', port,
		'--capture-tethered'
	];
	var p = cp.spawn(command,args, {cwd : targetDir, stdio:['ignore','pipe','pipe'] });
	p.stdout.on('data',function(d){
		console.log(port,d.toString());
	});

}


var args = ["--auto-detect"];

cp.exec(command +" "+ args.join(" "), function(err, stdout, stderr){
	var entries=stdout.toString().match(/usb:[0-9]+,[0-9]+/g);
	entries.forEach(captureTethered);
});