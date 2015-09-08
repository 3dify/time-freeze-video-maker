#!/usr/bin/env node

var fs = require('fs');
var args = require('yargs').argv;
var config = require('./config');
var VideoMaker = require('./VideoMaker');

var util = require('util')
if( fs.existsSync(config.privateConfig) ){
	var privateConfig = require(config.privateConfig);
	config = util._extend(config,privateConfig);
}

var cwd = process.cwd();
var videoMaker = VideoMaker(config);

if( args.w && args._.length == 0 ){
	videoMaker.watch(args.w);
}
else if(args._.length == 1 ){
	videoMaker.process(args._[0]);
}
else{
	videoMaker.exitWithError("missing arguments\nusage: main.js -w {watch_dir}\n       main.js {process_dir}");
}

