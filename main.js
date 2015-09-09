#!/usr/bin/env node

var fs = require('fs');
var util = require('util')
var args = require('yargs').argv;
var config = require('./config');
var VideoMaker = require('./VideoMaker');


if( fs.existsSync(config.privateConfig) ){
	var privateConfig = require(config.privateConfig);
	config = util._extend(config,privateConfig);
}

var cwd = process.cwd();
var videoMaker = VideoMaker(config);

if( args.w && args._.length == 0 ){
	videoMaker.watch(args.w);
}
else if(args.c && args._.length == 0){
	console.info(config);
}
else if(args._.length == 1 ){
	videoMaker.process(args._[0]);
}
else if(args.u && args._.length == 0){
	videoMaker.upload(args.u);
}
else{

	videoMaker.exitWithError(
		"missing arguments\n"+
		"usage: main.js -w {watch_dir}\n"+
		"       main.js {process_dir}"
	);
}

