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
const CWD = process.cwd() + '/';
let cowfigOpt = {
  env: process.env.NODE_ENV,
  plugins: {
    console: [],
    util: []
  },
  consoleLog: {
    env: true,
    progress: true
  },
  parser: {
    templateBase: CWD + 'config/template/',
    srcBase: CWD + 'config/',
    override: 'override'
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

/**
 * find *.cowfig file under template
 */
let findCowfig = function (dir) {
  let result = [];

  fs.readdirSync(dir).forEach(function (file) {
    file = dir + '/' + file;
    let stat = fs.statSync(file);

    if (stat && stat.isDirectory()) {
      if (file.match(/_/))
        return;
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

  console.log('usage: cowfig.js [-f skipMode] [-t TEMPLATE_PATH] [-s RESOURCE_PATH] [-d DESTATION_PATH] [-e ENV]');
  process.exit(-1);
};


function entry(cwd, args) {
  let ccOpt, cowfigFileList;

  cwd = cwd || CWD;
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

  // overwrite configure via arguments
  // ref: https://goo.gl/2d1LYo
  if (args.f)
    cowfigOpt.generator.skipMode = false;
  if (args.e)
    cowfigOpt.env = args.e;
  if (args.s)
    cowfigOpt.parser.srcBase = args.s;
  if (args.t)
    cowfigOpt.parser.templateBase = args.t;
  if (args.d)
    cowfigOpt.generator.destBase = args.d;

  // convert relative path to absolute
  cowfigOpt.parser.srcBase = path.resolve(cowfigOpt.parser.srcBase) + '/';
  cowfigOpt.parser.templateBase = path.resolve(cowfigOpt.parser.templateBase) + '/';
  cowfigOpt.generator.destBase = path.resolve(cowfigOpt.generator.destBase) + '/';

  /**
   * step 2: find cowfig file in templateBase
   */
  try {
    if (fs.statSync(cowfigOpt.parser.templateBase)) {
      cowfigFileList = findCowfig(cowfigOpt.parser.templateBase);
    }
  }
  catch (e) {
    usage();
  }


  /**
   * step 3: parse cowfig, write out .json
   */
  cowfigOpt.parser.env = cowfigOpt.env;
  if (cowfigOpt.consoleLog.env) {
    console.log('---\r');
    console.log('Cowfig works with followed configuration:\r\n%j\r', cowfigOpt.parser);
    console.log('---\r');
  }
  let parser = new Parser(cowfigOpt.parser);

  for (let i = 0; i < cowfigFileList.length; i++) {
    let destFile, destPath;
    let content, pretty;
    let data = parser.parseFile(cowfigFileList[i].fname);

    if (data.__mtime > cowfigFileList[i].mtime)
      cowfigFileList[i].mtime = data.__mtime;
    delete data.__mtime;

    // COPY file
    if (data.__copy) {
      for (let j = 0; j < data.__copy.length; j++) {
        destFile = cowfigOpt.generator.destBase + data.__copy[j].dest;
        destPath = path.dirname(destFile);
        mkdirp.sync(destPath);

        fs.createReadStream(data.__copy[j].src)
          .pipe(fs.createWriteStream(destFile));
      }

      if (Object.getOwnPropertyNames(data).length == 1)
        continue;
      else
        delete data.__copy;
    }

    // override template __pretty setting
    if (data.__pretty) {
      pretty = JSON.parse(JSON.stringify(data.__pretty));
      delete data.__pretty;
    }
    else
      pretty = cowfigOpt.generator.pretty;
    content = stringify(data, pretty);
    destFile = cowfigOpt.generator.destBase + cowfigFileList[i].fname + '.json';

    destPath = path.dirname(destFile);
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
