var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var events = require('events');
var path = require('path');

var watch = require('watch');
var glob = require("glob");


module.exports = function(config){
	var exports = {};
	var eventEmitter = new events.EventEmitter();
	var app = express();
	app.use(bodyParser.json());
	app.use(express.static(config.webroot));
	var currentWatchDir;
	var dir = [];
	var metadata = {};

	var watchDir = exports.watch = function(dir){
		currentWatchDir = dir = resolveDirectory(dir);

		scanDir(dir).then(function(){
			console.log("Watching for new dirs");
			watch.watchTree(dir, function(f, curr, prev){
				//console.log('change to {0}'.format(f));
				if( curr && prev === null ){
					var ldir = path.dirname(f);
					if(ldir[0]==='.') return;
					if(ldir==dir){
						checkDir(f);
					}
				}
				if( prev && curr && curr.dev===0 ){
					var ldir = path.dirname(f);
					if(ldir[0]===".") return;
					if(ldir==dir){
						deletedDir(f);
					}
				}
				
			});
		});
	}

	var scanDir = exports.scanDir = function(scanPath){
		return new Promise(function(res,rej){
			scanPath = resolveDirectory(scanPath);
			getDirectories(scanPath,function(subdirs){
				//console.log(">>>"+subdirs);
				Promise.all( subdirs.map(function(dir){
					return addDir(path.join(scanPath,dir));
				}) ).then(res);
			});
		});
	}

	var addDir = exports.addDir = function(dirPath){
		console.log("addDir "+dirPath);
		return new Promise(function(res,rej){
			dirPath = resolveDirectory(dirPath);
			var dirName = path.basename(dirPath)
			dir.push(dirName);
			//function(a,b){ return parseInt(a)-parseInt(b); }
			dir.sort().reverse();
			
			getMetafile(dirPath).then(function(data){
				metadata[dirName] = data;
				res();
			},function(err){ 
				console.error(err);
				res(); 
			}).catch(function(err){
				console.error(err)
			});;
		});

	}

	var removeDir = function(dirPath){
		var dirName = path.basename(dirPath)
		dir.splice( dir.indexOf(dirName), 1 );
		delete metadata[dirName]
	}

	var checkDir = function(possibleNewDir){
		fs.stat(possibleNewDir,function(err,stats){
			if( stats.isDirectory() && dir.indexOf(path.basename(possibleNewDir))===-1){
				addDir(possibleNewDir);
			}
		});
	}

	var deletedDir = function(removedDir){
		fs.stat(removedDir,function(err,stats){
			if( err && dir.indexOf(path.basename(removedDir))!==-1){
				removeDir(removedDir);
			}
		});
	}


	var getDirectories = function(srcpath,onComplete) {
		return fs.readdir(srcpath,function(err,entries){ 
			if(err) throw err;
			onComplete(entries.filter(function(file) {
				return fs.statSync(path.join(srcpath, file)).isDirectory();
			}));
		});
	}

	var getMetafile = function(dir){

		var filePath = path.join(dir,config.metadata);
		return new Promise(function(res,rej){

			fs.readFile( filePath,'utf8', function(err,data){
				if(err){
					rej(err);
					return;
				}
				try {
					data = JSON.parse(data.toString());
					res(data);
				}
				catch(e){
					rej(new Error("Error parsing Json file: {0}\n{1}".format(filePath,e)));
				}
				
				
			})
		});
	}

	var saveMetadata = function(data){

		if( !data.dir.trim() ){
			console.error("No dir in metadata entry".red);
			return;
		}

		var dir = path.join(currentWatchDir,data.dir);
		metadata[data.dir] = data;
		fs.stat(dir,function(err,stat){
			if( err || !stat.isDirectory() ){
				console.error("Could not save metadata dir not found: {0}".format(dir).red);
			}
			var filePath = path.join(dir,config.metadata);
			fs.writeFile(filePath,JSON.stringify(data),function(err){
				console.log("{0} saved".format(filePath));
			});
		});
	}

	var resolveDirectory = function(dir){

		var resolvedDir = path.normalize(dir);

		if( !fs.existsSync(resolvedDir) ){
			eventEmitter.emit("fileFail","path {0} not found".format(dir));			
		}

		if( path.isAbsolute && path.isAbsolute(dir) ){
			resolvedDir = dir;
		}
		else {
			resolvedDir = fs.realpathSync(dir);
		}

		if(!fs.statSync(resolvedDir).isDirectory()){
			eventEmitter.emit("fileFail","path {0} given was not a directory",format(dir));						
		}

		if(resolvedDir.charAt(resolvedDir.length-1)=="/"){
			resolvedDir = resolvedDir.slice(0,-1);
		}

		return resolvedDir;

	}

	/*
	app.get('/',function(req,res){
		res.sendFile(config.formTemplate);
	});
	*/

	app.post('/',function(req,res){
		var formData = req.body;
		saveMetadata(formData);
		console.log(formData);
		res.json({'status':'OK'});
	});

	app.get('/list',function(req,res){
		var data = {};
		dir.forEach(function(key){
			data[key] = metadata[key] || {};
		});
		res.json(data);
	});

	app.listen(config.port, function(){
  		console.log('Express server listening on port ' + config.port);
	});
	return exports;

};