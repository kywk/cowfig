#!/usr/bin/env node
'use strict';

/**
 * Module dependencies.
 * Use node.js built-in module only.
 */
let fs = require('fs');
let path = require('path');
let mkdirp = require('mkdirp');
let minimist = require('minimist');
let stringify = require('json-stringify-pretty-compact');

// cowfig modules
let Parser = require('./lib/parser');


/**
 * Gloabl variable & default config
 */
let cowfigOpt = {
  console: {
    env: true,
    progress: true
  },
  pretty: {
    maxLength: 128,
    indent: 2
  }
};

let plugins = [];


/**
 * Common functions
 */
let findCowfig = function (dir) {
  let result = [];

  fs.readdirSync(dir).forEach(function (file) {
    file = dir + '/' + file;
    let stat = fs.statSync(file);

    if (stat && stat.isDirectory()) {
      result = result.concat(findCowfig(file))
    }
    else {
      if (file.match(/.*\.cowfig(\.json)?$/)) {
        let fstat = fs.statSync(file);
        result.push({
          fname: file.split('//').pop().split('.')[0],
          mtime: Date.parse(fstat.mtime)
        });
      }
    }
  });

  return result;
};


let usage = function (msg) {
  if (msg)
    console.log(msg);

  console.log('');
  console.log('  Usage: cowfig.js [-f skipMode] [-t TEMPLATE_PATH] [-s RESOURCE_PATH] [-d DESTATION_PATH] [-e ENV]');
  console.log('');
  process.exit(-1);
};


function entry(cwd, args) {
  let parseConfig, destBase, skipMode = true;
  let cowfigFileList;

  cwd = cwd || process.cwd() + '/';
  args = args || minimist(process.argv.slice(2));


  /**
   * Step 1: parse CLI arguments
   */
  if (args._.length) {
    for (let i = 0; i < plugins.length; i++) {
      if (args._[0] === plugins[i].cmd)
        plugins[i].exec(args);
        return;
    }
    usage();
  }

  if ((process.argv.length < 3) ||
      (args.h) || (args.help))
    usage();

  // default configure
  parseConfig = {
    'templateBase': cwd + 'config/template/',
    'srcBase': cwd + 'config/',
    'env': process.env.NODE_ENV
  };
  destBase = parseConfig.srcBase;

  // overwrite configure via arguments
  // ref: https://goo.gl/2d1LYo
  if (args.f)
    skipMode = false;
  if (args.e)
    parseConfig.env = args.e;
  if (args.s)
    parseConfig.srcBase = path.resolve(cwd, args.s) + '/';
  if (args.t)
    parseConfig.templateBase = path.resolve(cwd, args.t) + '/';
  if (args.d)
    destBase = path.resolve(cwd, args.d) + '/';


  /**
   * step 2: find cowfig file in templateBase
   */
  cowfigFileList = findCowfig(parseConfig.templateBase);


  /**
   * step 3: parse cowfig, write out .json
   */
  if (cowfigOpt.console.env) {
    console.log('---\r');
    console.log('Cowfig works with followed configuration:\r\n%j\r', parseConfig);
    console.log('---\r');
  }
  let parser = new Parser(parseConfig);

  for (let i = 0; i < cowfigFileList.length; i++) {
    let content, destFile;
    let data = parser.parseFile(cowfigFileList[i].fname);
    if (data.__mtime > cowfigFileList[i].mtime)
      cowfigFileList[i].mtime = data.__mtime;
    delete data.__mtime;

    if (data.__copy) {
      content = data.__content;
      destFile = destBase + path.dirname(cowfigFileList[i].fname) + '/' + data.__copy;
    } else {
      content = stringify(data, cowfigOpt.pretty);
      destFile = destBase + cowfigFileList[i].fname + '.json';
    }

    let destPath = path.dirname(destFile);
    mkdirp.sync(destPath);

    let skip = false;
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
};

module.exports = entry();
