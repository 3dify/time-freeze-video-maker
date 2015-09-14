var fs = require('fs');
var path = require('path');
var watch = require('watch');

var CREATED='created', 
	REMOVED='removed',
	UPDATED='updated';

module.exports = function(directory, callback) {
  
  console.info('watching', directory);

  var onTreeChanged = function (f, curr, prev) {
    var action;
    if (typeof f == "object" && prev === null && curr === null) {
      // Finished walking the tree
    } else if (prev === null) {
      // f is a new file
      action = CREATED; 
    } else if (curr.nlink === 0) {
      // f was removed
      action = REMOVED;
    } else {
      // f was changed
      action = UPDATED;
    }

    if (action && action !== REMOVED) {
      var parentDir = path.dirname(f);
      
      if (fs.existsSync(parentDir)) {
          var files = fs.readdirSync(parentDir);
          callback(parentDir, files);
       }
    }
  };

  watch.watchTree(directory, onTreeChanged);
}

module.exports.CREATED = CREATED;
module.exports.UPDATED = UPDATED;
module.exports.REMOVED = REMOVED;
