var path = require('path');
var fs = require('fs');
var util = require('util');
var child_process = require('child_process');
var lodash = require('lodash');
var google = require('googleapis');
var stringformat = require('string-format');

var colors = require('colors');
var ObjectQ = require('objectq').ObjectQ;


var watcher = require('./watcher.js');
var ImageSequence = require('./ImageSequence');
var OAuthHelper = require('./OAuthHelper');
var PrintQRCode = require('./PrintQRCode');
var EmailNotifications = require('./EmailNotifications');

stringformat.extend(String.prototype,{});

module.exports = function(config){

	var currentSubdirs;
	var watchDir;
	var uploadAutomatically = true;
    var isProcessingVideo = false;
	var tasks;
	var currentId;
	var currentDir;
	
	OAuthHelper.options({
		scope:['https://www.googleapis.com/auth/youtube',
	    		'https://www.googleapis.com/auth/youtube.force-ssl',
	    		'https://www.googleapis.com/auth/youtube.upload'
	    ]});

	OAuthHelper.options({
		accessToken:config.youTube.accessToken,
		refreshToken:config.youTube.refreshToken
	});

	var emailer = new EmailNotifications(config);
	
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
		makeVideos(dir);
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


		if( files.length >= config.cameraOrder.length && !fs.existsSync(generateVideoFileName(parentDir)) ){
			notice( "Enqueing dir for processing {0}".format(parentDir) );
			queueVideo(parentDir,videoConfig);			
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
			makeVideos(next.parentDir);
		}
	}

	var makeVideos = function(parentDir){
		config.video.forEach( makeVideo.bind(null,parentDir) );
	}

	var makeVideo = function(parentDir,videoConfig){
		console.log("videoConfig=");
		console.info(videoConfig);
		var files;

		parentDir = resolveDirectory(parentDir);

		if( !files ){
			files = fs.readdirSync(parentDir);
		}

		files = files.filter(function(file){	
			var ext = path.extname(file).toLowerCase();
			return ['.jpg','.png'].indexOf(ext)>=0 && file.indexOf('-stabilized')==-1;
		});

		isProcessingVideo = true;
		currentId = generateId();
		currentDir = parentDir;
		
		files.sort();
		var filePaths = files.map(function(file){ return path.join(parentDir,file) });

		//filePaths = stabilizeImages(filePaths);

		imageSequence = ImageSequence(filePaths,config);
		if( videoConfig.header && videoConfig.headerDuration ){ 
			imageSequence.header( fs.realpathSync(videoConfig.header),Math.floor(videoConfig.headerDuration*videoConfig.framerate));
		}
		if( videoConfig.footer && videoConfig.footerDuration ){ 
			imageSequence.footer( fs.realpathSync(videoConfig.footer),Math.floor(videoConfig.footerDuration*videoConfig.framerate));
		}

		var sequenceFilename = imageSequence.save();
		var outputFile = generateVideoFileName(parentDir+videoConfig.outputFileSuffix);

		//ffmpeg -r $FPS -f concat -i $1 -r $FPS -vf crop=2048:1536 -vf scale=1024:768 $2
		var ffmpegArgs = [
			'-r', videoConfig.framerate,
			'-f', 'concat',
			'-safe','0',
			'-i', sequenceFilename,
			'-r', videoConfig.framerate,
		];

		if(videoConfig.crop instanceof Array){
			ffmpegArgs.push('-vf', 'crop='+videoConfig.crop[0]+':'+videoConfig.crop[1]);		
		}

		ffmpegArgs.push(
			'-vf', 'scale='+videoConfig.width+":"+videoConfig.height,
			'-c:v', 'libx264',
			'-b:v', videoConfig.bitrate
		);

		if(videoConfig.ffmpegExtraSettings instanceof Array){
			ffmpegArgs.push.apply(ffmpegArgs,videoConfig.ffmpegExtraSettings);
		}

		ffmpegArgs.push('-y',outputFile);

		var ffmpegCmd = config.ffmpegBinary;

		console.info(ffmpegArgs);

		child = child_process.spawnSync(ffmpegCmd,ffmpegArgs, { stdio : 'inherit'});


		if(child.status!=0){
			process.exit(1);
		}

		if( videoConfig.postCreateTask === 'youTube' ){
			upload(outputFile);
		}
		else if( videoConfig.postCreateTask === 'email' ){
			email(outputFile);
		}
		else {
			isProcessingVideo = false;
			shiftQueue();
		}
	}

	var stabilizeImages = function(orig){
		orig = orig.map(function(file){ return fs.realpathSync(file); });
		var dest = orig.map(function(img){
			var parts = img.split('.');
			parts[parts.length-2]+='-stabilized';
			return parts.join('.');
		});

		stabilize(orig, dest);

		return dest;
	}

	var generateVideoFileName = function(dir){
		return dir+".mp4"
	}

	var email = function(outputFile){
		console.log("emailing");
		emailer.sendEmail("ian@3dify.co.uk",{url:"http://test.com"},[{filename: "video.mp4",path:outputFile}]);
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
			date : new Date().toLocaleDateString(),
			time : new Date().toLocaleTimeString()
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
			config.serialPrinter.footerText = [currentId,"http://3dify.co.uk/"];

			if( currentDir ) fs.writeFileSync(path.join(currentDir,currentId+".txt"),videoUrl);
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

	var generateId = function(){
		return Math.floor(Date.now()/1000).toString(36).toUpperCase();
	}

	var exports = {
		watch : watch,
		process : processDir,
		upload : upload,
		automaticUpload : automaticUpload,
		exitWithError : exitWithError,
		warning : warning,
		notice : notice
	}

	return exports;
}