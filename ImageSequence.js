var path = require('path');
var fs = require('fs');

module.exports = function(files,config){
	
	var filename = path.join(config.tmpPath,"ImageSequence."+Date.now()+'.txt');
	var output = files.map(function(file){
		return 'file \''+file+'\'';
	}).join('\n');

	var loops = config.loop || 1;
	var loopedOutput = output;
	for( var i=1;i<loops;i++ ){
		loopedOutput+='\n'+output;
	}
	output = loopedOutput;

	return {
		save : function(){
			fs.writeFileSync(filename,output);
			return filename;
		},
		delete : function(){
			fs.unlinkSync(filename);
		}
	}
}