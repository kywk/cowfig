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
let override = require('./lib/util/override');


/**
 * Gloabl variable & default config
 */
let cowfigOpt = {
  plugins: {
    console: [],
    util: []
  },
  consoleLog: {
    env: true,
    progress: true
  },
  generator: {
    pretty: {
      maxLength: 128,
      indent: 2
    },
    destBase: process.cwd() + '/',
    skipMode: true
  },
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
  console.log('');
  if (msg)
    console.log('  ' + msg);

  console.log('');
  console.log('  Usage: cowfig.js [-f skipMode] [-t TEMPLATE_PATH] [-s RESOURCE_PATH] [-d DESTATION_PATH] [-e ENV]');
  console.log('');
  process.exit(-1);
};


function entry(cwd, args) {
  let parseOpt, ccOpt;
  let cowfigFileList;

  cwd = cwd || process.cwd() + '/';
  args = args || minimist(process.argv.slice(2));

  /**
   * Step 0: Setup cowfig
   */
  if (args.c) {
    try {
      if (fs.statSync(args.c).isFile()) {
        ccOpt = require(cwd + args.c);
        override(cowfigOpt, ccOpt);
      }
    }
    catch (e) {
      usage('ERROR: config file (' + args.c + ') not found or not JSON format.');
    }
  }


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

  // default configure for parser & generator
  parseOpt = {
    templateBase: cwd + 'config/template/',
    srcBase: cwd + 'config/',
    env: process.env.NODE_ENV
  };

  // overwrite configure via arguments
  // ref: https://goo.gl/2d1LYo
  if (args.f)
    cowfigOpt.generator.skipMode = false;
  if (args.e)
    parseOpt.env = args.e;
  if (args.s)
    parseOpt.srcBase = path.resolve(cwd, args.s) + '/';
  if (args.t)
    parseOpt.templateBase = path.resolve(cwd, args.t) + '/';
  if (args.d)
    cowfigOpt.generator.destBase = path.resolve(cwd, args.d) + '/';


  /**
   * step 2: find cowfig file in templateBase
   */
  try {
    if (fs.statSync(parseOpt.templateBase)) {
      cowfigFileList = findCowfig(parseOpt.templateBase);
    }
  }
  catch (e) {
    usage();
  }


  /**
   * step 3: parse cowfig, write out .json
   */
  if (cowfigOpt.consoleLog.env) {
    console.log('---\r');
    console.log('Cowfig works with followed configuration:\r\n%j\r', parseOpt);
    console.log('---\r');
  }
  let parser = new Parser(parseOpt);

  for (let i = 0; i < cowfigFileList.length; i++) {
    let content, destFile;
    let data = parser.parseFile(cowfigFileList[i].fname);
    if (data.__mtime > cowfigFileList[i].mtime)
      cowfigFileList[i].mtime = data.__mtime;
    delete data.__mtime;

    // COPY file
    if (data.__copy) {
      for (let j = 0; j < data.__copy.length; j++) {
        fs.createReadStream(data.__copy[j].src)
          .pipe(fs.createWriteStream(cowfigOpt.generator.destBase + data.__copy[j].dest));
      }

      if (Object.getOwnPropertyNames(data).length == 1)
        continue;
      else
        delete data.__copy;
    }

    content = stringify(data, cowfigOpt.pretty);
    destFile = cowfigOpt.generator.destBase + cowfigFileList[i].fname + '.json';

    let destPath = path.dirname(destFile);
    mkdirp.sync(destPath);

    let skip = false;
    try {
      if (Date.parse(fs.statSync(destFile).mtime) > cowfigFileList[i].mtime)
        skip = true;
    } catch (e) {}

    if (cowfigOpt.generator.skipMode && skip) {
      console.log('skip: %j\r', destFile);
    }
    else {
      console.log('writing: %j\r', destFile);
      fs.writeFileSync(destFile, content);
    }
  }
};

module.exports = entry();
