
const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname,'../');
const outDir = path.resolve(__dirname,'../.logs');
fs.readdir(dir, function (err, files) {
    //handling error
    if (err) {
        return;
    } 
    //listing all files using forEach
    files.forEach(async function (filename) {
        // Do whatever you want to do with the file
        try {
            return await removeLog(filename);
        } catch {
            return;
        }
    });
});

module.exports = removeLog;
async function removeLog(filename){

    if(filename.indexOf('-debug.log') > -1){
        try {

        const filePath = path.resolve(dir,filename);
        const outFilePath = path.resolve(outDir,filename);
        const exists = fs.existsSync(filePath);

        const copy = ()=>fs.copyFileSync(filePath,outFilePath);

        if(exists){
            
                copy();
                setTimeout(()=>{
                    fs.unlinkSync(filePath);
                },50)

                return {movedLogs:true}
        }
    }
        catch{
            return
        }
    }
    else {
        return;
    }
}
