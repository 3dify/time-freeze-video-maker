var path = require('path');
var fs = require('fs');

module.exports = function(files,config){
	
	var filename = path.join(config.tmpPath,"ImageSequence."+Date.now()+'.txt');
	var format = function(image){
		return 'file \''+file+'\'';
	};

	var output = files.map(format).join('\n');

	var loops = config.video.loop || 1;
	var loopedOutput = output;
	for( var i=1;i<loops;i++ ){
		loopedOutput+='\n'+output;
	}
	output = loopedOutput;

	return {
		header : function(image,frames){
			format(image);
			for( var i=0;i<frames;i++ ){
				output=image+'\n'+output;
			}
		},
		footer : function(image,frames){
			format(image);
			for( var i=0;i<frames;i++ ){
				output=output+'\n'+image;
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