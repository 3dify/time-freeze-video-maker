var stabilize = require('stabilize');
var fs = require('fs');

var orig = fs.readFileSync('images-stablisation-test.txt',{encoding:'utf8'}).split("\n");
orig = orig.map(function(file){ return fs.realpathSync(file); });
var dest = orig.map(function(img){
	var parts = img.split('.');
	parts[parts.length-2]+='-stabilized';
	return parts.join('.');
});

console.log(orig);
console.log(dest);

stabilize(orig, dest);