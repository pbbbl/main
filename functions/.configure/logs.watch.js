const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname,'../');
const removeLog = require('./logs.remove');
fs.watch(dir, async(_,filename) => await removeLog(filename));
