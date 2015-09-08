#!/usr/bin/env node

var config = require('./config');
var VideoMaker = require('./VideoMaker');

var args = process.argv;
var cwd = process.cwd();
var videoMaker = VideoMaker(config);

if( args[0] == 'node' )
{
	args.shift();
}

if( args.length == 3 && args[2]=="-w" ){
	videoMaker.watch(args[3]);
}
else if(args.length == 2){
	videoMaker.process(args[1]);
}
else{
	videoMaker.exitWithError("missing arguments\nusage: main.js -w {watch_dir}\n       main.js {process_dir}");
}

