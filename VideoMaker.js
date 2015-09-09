var path = require('path');
var fs = require('fs');
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

	var onAuthComplete = function(outputFile){
		var youtube = google.youtube({version:'v3'});

			/*
	resource: {
			    title: path.basename(outputFile),
			    mimeType: 'video/mp4'
			  }
			*/

			youtube.videos.insert({
			  part: "statistics",
			  media: {
			    mimeType: 'video/mp4',
			    body: fs.createReadStream(outputFile) 
			  }
			}, onVideoUploaded);
	}

	var onVideoUploaded = function(err){
		if(err){
			console.error(err);
			console.log(arguments);
		}
		else {
			console.log('video uploaded');
		}
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

	var onUploadComplete = function(err, res){
		if (err) throw err;
		console.log('done');
		console.log(res.id);
		console.log(res.url);
		console.log(res.embed());
		console.log(res.embed(320, 320));
		console.log(util.inspect(res, false, 15, true));
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