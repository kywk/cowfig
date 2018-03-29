
/**
 * Module dependencies
 */
let fs = require('fs');
let path = require('path');

let mkdirp = require('mkdirp');
let JSON5 = require('json5');
let traverse = require('traverse');
let stringify = require('json-stringify-pretty-compact');

// cowfig modules
let override = require('./util/override');


function writeFile (file, data, pretty) {
  let content = stringify(data, pretty);
  let destPath = path.dirname(file);
  mkdirp.sync(destPath);

  console.log('writing: %j\r', file);
  fs.writeFileSync(file, content);
  return;
};


function write (data, fname, opt) {
  let destFile, destPath, destMtime = 0;
  let content, mtime, writerOpt;

  mtime = data.__mtime;
  delete data.__mtime;

  if (!/\.json/.test(fname))
    fname = fname + '.json';

  // COPY file
  if (data.__copy) {
    for (let j = 0; j < data.__copy.length; j++) {
      destFile = opt.destBase + data.__copy[j].dest;
      destPath = path.dirname(destFile);
        mkdirp.sync(destPath);

      console.log('copying: %j\r', destFile);
      fs.createReadStream(data.__copy[j].src)
        .pipe(fs.createWriteStream(destFile));
    }

    delete data.__copy;
  }

  // keep destination
  try {
    let destData, destObj;
    destFile = path.resolve(opt.destBase, fname);
    destMtime = Date.parse(fs.statSync(destFile).mtime);

    if ((data.__writer) && (data.__writer.keep)) {
      destData = JSON5.parse(fs.readFileSync(destFile, 'utf8'));
      for (let j = 0; j < data.__writer.keep.length; j++) {
        destObj = traverse(destData).get(data.__writer.keep[j].split('.'));
        if (destObj !== 'undefined')
          traverse(data).set(data.__writer.keep[j].split('.'), destObj);
      }
    }
  }
  catch (e) { /* console.log(e); */ }

  // override writer setting
  if (data.__writer) {
    writerOpt = override(opt, data.__writer);
    delete data.__writer;
  }
  else
    writerOpt = opt;

  // Check if empty object
  if ((Object.getOwnPropertyNames(data).length == 0) && (!writerOpt.emptyObj))
    console.log('skip empty file: %j\r', destFile);
  // Check if overwrite exist destination file
  else if (((destMtime > mtime) && (writerOpt.overwrite === 'auto')) ||
           ((destMtime != 0) && (writerOpt.overwrite === 'never')))
    console.log('skip newer file: %j\r', destFile);
  else
    writeFile(destFile, data, writerOpt.pretty);

  return;
};

module.exports = write;
