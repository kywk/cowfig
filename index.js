#!/usr/bin/env node
'use strict';

/**
 * Module dependencies.
 * Use node.js built-in module only.
 */
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var stringify = require('json-stringify-pretty-compact');

var Parser = require('./lib/parser');



/**
 * Gloabl variable & default config
 */
var _cwd = process.cwd() + '/';
var parseConfig = {
  'templateBase': _cwd + 'config/template/',
  'srcBase': _cwd + 'config/',
  'env': process.env.NODE_ENV
};
var destBase = parseConfig.srcBase;
var prettyOpt = {'maxLength': 128, 'indent': 2};
var skipMode = true;


/**
 * Common functions
 */
var findCowfig = function(dir) {
  var result = [];

  fs.readdirSync(dir).forEach(function(file) {
    file = dir + '/' + file;
    var stat = fs.statSync(file);

    if (stat && stat.isDirectory()) {
      result = result.concat(findCowfig(file))
    }
    else {
      if (file.match(/.*\.cowfig(\.json)?$/)) {
        var fstat = fs.statSync(file);
        result.push({
          fname: file.split('//').pop().split('.')[0],
          mtime: Date.parse(fstat.mtime)
        });
      }
    }
  });

  return result;
};


var usage = function (msg) {
  if (msg)
    console.log(msg);

  console.log('');
  console.log('  Usage: cowfig.js [-f skipMode] [-t TEMPLATE_PATH] [-s RESOURCE_PATH] [-d DESTATION_PATH] [-e ENV]');
  console.log('');
  process.exit(-1);
};



/**
 * Step 1: parse CLI arguments
 */
if (process.argv.length < 3)
  usage();

for (var i = 2; i < process.argv.length; i++) {
  if (process.argv[i].match(/^-h$/i))
    usage();
  else if (process.argv[i].match(/^-f$/i))
    skipMode = false;
  else if (process.argv[i].match(/^-s$/i))
    parseConfig.srcBase = path.resolve(_cwd, process.argv[i + 1]) + '/';
  else if (process.argv[i].match(/^-t$/i))
    parseConfig.templateBase = path.resolve(_cwd, process.argv[i + 1]) + '/'
  else if (process.argv[i].match(/^-e$/i))
    parseConfig.env = process.argv[i + 1];
  else if (process.argv[i].match(/^-d$/i))
    destBase = path.resolve(_cwd, process.argv[i + 1]) + '/'
}

/**
 * step 2: find cowfig file in templateBase
 */
var cowfigFileList = findCowfig(parseConfig.templateBase);

/**
 * step 3: parse cowfig, write out .json
 */
console.log("---\r");
console.log("Cowfig-parser works with followed configuration:\r\n%j\r", parseConfig);
//console.log(parseConfig+'\r');
console.log("---\r");

var parser = new Parser(parseConfig);

for (var i = 0; i < cowfigFileList.length; i++) {
  var data = parser.parseFile(cowfigFileList[i].fname);
  if (data.__mtime > cowfigFileList[i].mtime)
    cowfigFileList[i].mtime = data.__mtime;
  delete data.__mtime;

  if (data.__copy) {
    var content = data.__content;
    var destFile = destBase + path.dirname(cowfigFileList[i].fname) + '/' + data.__copy;
  } else {
    var content = stringify(data, prettyOpt);
    var destFile = destBase + cowfigFileList[i].fname + '.json';
  }

  var destPath = path.dirname(destFile);
  mkdirp.sync(destPath);

  var skip = false;
  try {
    if (Date.parse(fs.statSync(destFile).mtime) > cowfigFileList[i].mtime)
      skip = true;
  } catch (e) {}

  if (skipMode && skip) {
    console.log('skip: %j\r', destFile);
  }
  else {
    console.log('writing: %j\r', destFile);
    fs.writeFileSync(destFile, content);
  }
}
