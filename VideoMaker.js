var path = require('path');
var fs = require('fs');
var util = require('util');
var child_process = require('child_process');
var lodash = require('lodash');
var watcher = require('./watcher.js');
var google = require('googleapis');
require('stringformat').extendString();

var colors = require('colors');
var ObjectQ = require('objectq').ObjectQ;


var ImageSequence = require('./ImageSequence');
var OAuthHelper = require('./OAuthHelper');
var PrintQRCode = require('./PrintQRCode');

module.exports = function(config){

	var currentSubdirs;
	var watchDir;
	var uploadAutomatically = true;

    var isProcessingVideo = false;
	var tasks;
	
	OAuthHelper.options({
		scope:['https://www.googleapis.com/auth/youtube',
	    		'https://www.googleapis.com/auth/youtube.force-ssl',
	    		'https://www.googleapis.com/auth/youtube.upload'
	    ]});

	OAuthHelper.options({
		accessToken:config.youTube.accessToken,
		refreshToken:config.youTube.refreshToken
	});
	
	var watch = function(dir){
		
		watchDir = dir = resolveDirectory(dir);
		
		tasks = new ObjectQ(path.join(watchDir,config.queueFile), config.queueAutoSavePeriod);
		
		process.on('SIGINT', function () {
			tasks.shutdown(function (err) {
		    if (err) throw err;
		    process.exit(0);
		  });
		  
		});

		watcher( dir, onDirChanged );
		shiftQueue();
	}

	var processDir = function(dir){
		notice("processing "+dir);
		
		makeVideo(dir);

	}

	var exitWithError = function(){
		var msg = '\nError:\n'+Array.prototype.slice.call(arguments).map(traceOrInspect).join('\n')+'\n';
		process.stderr.write(msg.red);
		process.exit(1);
	}

	var warning = function(){
		var msg = '\nWarning:\n'+Array.prototype.slice.call(arguments).map(traceOrInspect).join('\n')+'\n';
		process.stderr.write(msg.yellow);
	}

	var notice = function(){
		var msg = '\nNotice:\n'+Array.prototype.slice.call(arguments).map(traceOrInspect).join('\n')+'\n';
		process.stderr.write(msg.grey);
	}

	var automaticUpload = function(enabled){
		uploadAutomatically = enabled;
	}

	var upload = function(outputFile){
		
		OAuthHelper.authenticate( config, onAuthComplete.bind(null,outputFile) );
			
	}

	var onDirChanged = function(parentDir, files){

		if( watchDir == parentDir ) return;


		if( files.length >= config.video.numCameras && !fs.existsSync(generateVideoFileName(parentDir)) ){
			notice( "Enqueing dir for processing {0}".format(parentDir) );
			queueVideo(parentDir);			
		}

		if( !isProcessingVideo ) shiftQueue();
	}

	var queueVideo = function(parentDir,files){
		var notInQueue = tasks._queue.every(function(task){ return task.parentDir!=parentDir });
		if( notInQueue ){
			tasks.queue({parentDir:parentDir});
			tasks.flush();
		}
	}

	var shiftQueue = function(){
		/* if tasks is undefined abort */
		if( !tasks ) return;


		var next = tasks.shift();
		tasks.flush();
		if( next ){
			makeVideo(next.parentDir);
		}
	}

	var makeVideo = function(parentDir,files){
		parentDir	 = resolveDirectory(parentDir);

		if( !files ){
			files = fs.readdirSync(parentDir);
		}

		isProcessingVideo = true;
		files.sort();
		var filePaths = files.map(function(file){ return path.join(parentDir,file) });
		imageSequence = ImageSequence(filePaths,config);
		var sequenceFilename = imageSequence.save();
		var outputFile = generateVideoFileName(parentDir);

		//ffmpeg -r $FPS -f concat -i $1 -r $FPS -vf crop=2048:1536 -vf scale=1024:768 $2
		var ffmpegArgs = [
			'-r', config.video.framerate,
			'-f', 'concat',
			'-i', sequenceFilename,
			'-r', config.video.framerate,
			//'-vf', 'crop=2048:1536',
			'-vf', 'scale='+config.video.width+":"+config.video.height,
			'-c:v', 'libx264',
			'-b:v', config.video.bitrate,
			'-profile:v', 'high',
			'-pix_fmt', 'yuv420p',
			'-level', '4.0',
			'-y',
			outputFile
		];
		var ffmpegCmd = config.video.ffmpegBinary;
		child = child_process.spawnSync(ffmpegCmd,ffmpegArgs, { stdio : 'inherit'});

		if(child.status>0){
			process.exit(1);
		}

		if( uploadAutomatically ){
			upload(outputFile);
		}
		else {
			isProcessingVideo = false;
			shiftQueue();
		}
	}

	var generateVideoFileName = function(dir){
		return dir+".mp4"
	}

	var onAuthComplete = function(outputFile){
		uploadVideoFile(outputFile);
	}

	var uploadVideoFile = function(outputFile){
		var youtube = google.youtube({version:'v3'});
		var videoData =  {
		  part: "statistics, contentDetails, snippet",
		  resource: {
		  	snippet :{
		  	}

		  },
		  media: {
		    mimeType: 'video/mp4',
		    body: fs.createReadStream(outputFile) 
		  }
		};

		var data = {
			dir : path.basename(outputFile,'.mp4'),
			date : d.toLocaleDateString(),
			time : d.toLocaleTimeString()
		}

		if( config.youTube.channel ) videoData.resource.snippet.channelId = config.youTube.channel;  	
		if( config.youTubeOptions.title ) videoData.resource.snippet.title = config.youTubeOptions.title.format(data);
		if( config.youTubeOptions.tags ) videoData.resource.snippet.tags = config.youTubeOptions.tags;
		if( config.youTubeOptions.description ) videoData.resource.snippet.description = config.youTubeOptions.description.format(data);

		youtube.videos.insert(videoData, onUploadComplete);
	}

	var onUploadComplete = function(err,videoData){
		if(err){
			warning(err);
		}
		else {
			var videoUrl = config.youTubeOptions.shortUrl.format(videoData.id);
			console.log('video uploaded '+videoUrl);
			PrintQRCode.printUrl(videoUrl,config.serialPrinter, onPrintingComplete);
		}

	}

	var onPrintingComplete = function(err){
		if( err ){
			warning(err.toString());
		}
		isProcessingVideo = false;
		shiftQueue();

	}

	var resolveDirectory = function(dir){

		var resolvedDir = dir;

		if( !fs.existsSync(resolvedDir) ){
			exitWithError("path {0} not found".format(dir));			
		}

		if( path.isAbsolute(dir) ){
			resolvedDir = dir;
		}
		else {
			resolvedDir = fs.realpathSync(dir);
		}

		if(!fs.statSync(resolvedDir).isDirectory()){
			exitWithError("path {0} given was not a directory",format(dir));						
		}

		if(resolvedDir.charAt(resolvedDir.length-1)=="/"){
			resolvedDir = resolvedDir.slice(0,-1);
		}

		return resolvedDir;

	}

	var traceOrInspect = function(m){ 
		return (typeof(m)=='string')?m:util.inspect(m)+' '; 
	}

	var exports = {
		watch : watch,
		process : processDir,
		upload : upload,
		exitWithError : exitWithError,
		warning : warning,
		notice : notice
	}

	return exports;
}