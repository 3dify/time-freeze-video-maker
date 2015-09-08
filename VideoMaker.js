var path = require('path');
var fs = require('fs');

module.exports = function(config){
	
	var endpoints = {};

	endpoints.watch = function(dir){
		dir = resolvePath(dir);
		console.log("watching "+dir);
	}

	endpoints.process = function(dir){
		dir = resolvePath(dir);
		console.log("processing "+dir);
	}

	endpoints.exitWithError = function(msg){
		process.stderr.write(msg+"\n");
		process.exit(1);
	}

	var resolvePath = function(dir){

		var resolvedDir = dir;

		if( !fs.existsSync(resolvedDir) ){
			endpoints.exitWithError("directory not found");			
		}

		if( path.isAbsolute(dir) ){
			resolvedDir = dir;
		}
		else {
			resolvedDir = fs.realpathSync(dir);
		}

		if(!fs.statSync(resolvedDir).isDirectory()){
			endpoints.exitWithError("path given was not a directory");						
		}

		return resolvedDir;

	}

	return endpoints;
}