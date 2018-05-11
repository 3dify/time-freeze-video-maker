const path = require('path');

module.exports = function(child, parent){
    if (child === parent) return false
    const parentTokens = parent.split(path.sep).filter(i => i.length)
    return parentTokens.every((t, i) => child.split(path.sep)[i] === t)
};