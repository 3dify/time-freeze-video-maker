var path = require('path');
var fs = require('fs');

module.exports = function(files,config){
	
	var filename = path.join(config.tmpPath,"ImageSequence."+Date.now()+'.txt');
	var output = files.map(function(file){
		return 'file \''+file+'\'';
	}).join('\n');

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