var path = require('path');
var fs = require('fs');

module.exports = function(files,config){
	
	var filename = path.join(config.tmpPath,"ImageSequence."+Date.now()+'.txt');
	var format = function(file){
		return 'file \''+file+'\'';
	};

	var output = files.map(format).join('\n');
	var numFirstFrames = Math.floor( ( config.firstFrameDuration || 0 ) * config.framerate );

	var loops = config.video.loop || 1;
	var loopedOutput = output;
	for( var i=1;i<loops;i++ ){
		loopedOutput+='\n'+output;
	}

	output = loopedOutput;

	for(var i=1;i<numFirstFrames;i++){
		output=format(files[0])+'\n'+output;
	}


	return {
		header : function(image,frames){
			format(image);
			for( var i=0;i<frames;i++ ){
				output=format(image)+'\n'+output;
			}
		},
		footer : function(image,frames){
			format(image);
			for( var i=0;i<frames;i++ ){
				output=output+'\n'+format(image);
			}

		},
		save : function(){
			fs.writeFileSync(filename,output);
			return filename;
		},
		delete : function(){
			fs.unlinkSync(filename);
		}
	}
}