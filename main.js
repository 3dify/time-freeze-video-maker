#!/usr/bin/env node

var fs = require('fs');
var config = require('./config');
var VideoMaker = require('./VideoMaker');

var util = require('util')
if( fs.existsSync(config.privateConfig) ){
	var privateConfig = require(config.privateConfig);
	config = util._extend(config,privateConfig);
}

console.log(config);

var args = process.argv;
var cwd = process.cwd();
var videoMaker = VideoMaker(config);

if( args[0] == 'node' )
{
	args.shift();
}

if( args.length == 3 && args[1]=="-w" ){
	videoMaker.watch(args[2]);
}
else if(args.length == 2){
	videoMaker.process(args[1]);
}
else{
	videoMaker.exitWithError("missing arguments\nusage: main.js -w {watch_dir}\n       main.js {process_dir}");
}

