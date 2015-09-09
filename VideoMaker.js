var path = require('path');
var fs = require('fs');
var util = require('util');
var lodash = require('lodash');
var watcher = require('./watcher.js');
var youtube = require('youtube');
var child_process = require('child_process');
var ImageSequence = require('./ImageSequence');
var OAuthHelper = require('./OAuthHelper');
var google = require('googleapis');


module.exports = function(config){

	var endpoints = {};
	var currentSubdirs;
	var watchDir;
	var automaticUpload = true;

	OAuthHelper.options({
		scope:['https://www.googleapis.com/auth/youtube',
	    		'https://www.googleapis.com/auth/youtube.force-ssl',
	    		'https://www.googleapis.com/auth/youtube.upload'
	    ]});

	OAuthHelper.options({
		accessToken:config.youTube.accessToken,
		refreshToken:config.youTube.refreshToken
	});
	
	endpoints.watch = function(dir){
		watchDir = dir = resolveDirectory(dir);
		watcher( dir, onDirChanged )
	}

	endpoints.process = function(dir){
		dir = resolveDirectory(dir);
		console.log("processing "+dir);

		var files = fs.readdirSync(dir);
		
		makeVideo(dir, files)

	}

	endpoints.exitWithError = function(msg){
		process.stderr.write(msg+"\n");
		process.exit(1);
	}

	endpoints.automaticUpload = function(enabled){
		automaticUpload = enabled;
	}

	endpoints.upload = function(outputFile){
		/*
		var video = youtube
			.createUpload(outputFile)
			.user(config.youTube.user)
			.source(config.youTube.source)
			.password(config.youTube.password)
			.key(config.youTube.authKey)
			.title('Testing')
			.description('Some test stuff')
			//.category('Education')
			.upload(onUploadComplete);
			*/

			OAuthHelper.authenticate( config, onAuthComplete.bind(null,outputFile) );

			
	}

	var onDirChanged = function(parentDir, files){
		if( watchDir == parentDir ) return;

		console.log( parentDir, files );

		if( files.length >= config.numCameras ){
			makeVideo(parentDir,files)
		}
	}

	var makeVideo = function(parentDir,files){
		files.sort();
		var filePaths = files.map(function(file){ return path.join(parentDir,file) });
		imageSequence = ImageSequence(filePaths,config);
		var sequenceFilename = imageSequence.save();
		var outputFile = parentDir+".mp4";

		//ffmpeg -r $FPS -f concat -i $1 -r $FPS -vf crop=2048:1536 -vf scale=1024:768 $2
		var ffmpegArgs = [
			'-r', config.framerate,
			'-f', 'concat',
			'-i', sequenceFilename,
			'-r', config.framerate,
			//'-vf', 'crop=2048:1536',
			'-vf', 'scale='+config.width+":"+config.height,
			'-c:v', 'libx264',
			'-b:v', config.bitrate,
			'-profile:v', 'high',
			'-pix_fmt', 'yuv420p',
			'-level', '4.0',
			'-y',
			outputFile
		];
		var ffmpegCmd = config.ffmpegBinary;
		child = child_process.spawnSync(ffmpegCmd,ffmpegArgs, { stdio : 'inherit'});

		if(child.status>0){
			endpoints.exitWithError(child.stderr.toString());
		}

		if( automaticUpload ){
			upload(outputFile);
		}
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

			if( config.youTube.channel ) videoData.resource.snippet.channelId = config.youTube.channel;  	
			if( config.youTube.title ) videoData.resource.snippet.title = config.youTube.title;
			if( config.youTube.tags ) videoData.resource.snippet.tags = config.youTube.tags;
			if( config.youTube.description ) videoData.resource.snippet.description = config.youTube.description;

			console.log(videoData);

			youtube.videos.insert(videoData, onUploadComplete);
	}

	var onUploadComplete = function(err,videoData){
		if(err){
			console.error(err);
			console.log(arguments);
		}
		else {
			//console.log(videoData);
			var videoUrl = util.format(config.youTubeOptions.shortUrl,videoData.id);
			console.log('video uploaded '+videoUrl);
			
		}
	}

	var resolveDirectory = function(dir){

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