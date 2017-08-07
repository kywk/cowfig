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

let JSON5 = require('json5');
let traverse = require('traverse');

// cowfig modules
let Parser = require('./lib/parser');
let finder = require('./lib/finder');
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
  finder: {
    envPrefix: '_'
  },
  parser: {
    templateBase: CWD + 'config/template/',
    srcBase: CWD + 'config/',
    override: 'override'
  },
  writer: {
    pretty: {
      maxLength: 128,
      indent: 2
    },
    destBase: process.cwd() + '/',
    overwrite: "auto",
    force: false
  },
};

let plugins = [];


/**
 * Common functions
 */
let usage = function (msg) {
  if (msg)
    console.log(msg);

  console.log('usage: cowfig.js [-t TEMPLATE] [-s RESOURCE] [-d DESTINATION] [-e ENV] [-o overwrite] [-f]');
  process.exit(-1);
};


let fileWriter = function (file, data, pretty) {
  let content = stringify(data, pretty);
  let destPath = path.dirname(file);
  mkdirp(destPath);

  console.log('writing: %j\r', file);
  fs.writeFileSync(file, content);
  return;
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
        cowfigOpt = override(cowfigOpt, ccOpt);
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
  if (args.e)
    cowfigOpt.env = args.e;
  if (args.t)
    cowfigOpt.parser.templateBase = args.t;
  if (args.s)
    cowfigOpt.parser.srcBase = args.s;
  if (args.d)
    cowfigOpt.writer.destBase = args.d;
  if (args.o) {
    if ((args.o === 'never') || (args.o === 'always'))
      cowfigOpt.writer.overwrite = args.o;
  }
  if (args.f)
    cowfigOpt.writer.force = true;

  // convert relative path to absolute
  cowfigOpt.parser.srcBase = path.resolve(cowfigOpt.parser.srcBase) + '/';
  cowfigOpt.parser.templateBase = path.resolve(cowfigOpt.parser.templateBase) + '/';
  cowfigOpt.writer.destBase = path.resolve(cowfigOpt.writer.destBase) + '/';


  /**
   * step 2: find cowfig file in templateBase
   */
  cowfigFileList = finder(cowfigOpt.parser.templateBase, cowfigOpt.finder.envPrefix);
  if (!cowfigFileList)
    usage();


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
    let destFile, destPath, destMtime = 0;
    let content, writerOpt;
    let data = parser.parseFile(cowfigFileList[i].fname);

    if (data.__mtime > cowfigFileList[i].mtime)
      cowfigFileList[i].mtime = data.__mtime;
    delete data.__mtime;

    // COPY file
    if (data.__copy) {
      for (let j = 0; j < data.__copy.length; j++) {
        destFile = cowfigOpt.writer.destBase + data.__copy[j].dest;
        destPath = path.dirname(destFile);
        mkdirp.sync(destPath);

        console.log('copying: %j\r', destFile);
        fs.createReadStream(data.__copy[j].src)
          .pipe(fs.createWriteStream(destFile));
      }

      if (Object.getOwnPropertyNames(data).length == 1)
        continue;
      else
        delete data.__copy;
    }

    // keep destination
    try {
      let destData, destObj;
      destFile = path.resolve(cowfigOpt.writer.destBase, cowfigFileList[i].fname + '.json');
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
      writerOpt = override(cowfigOpt.writer, data.__writer);
      delete data.__writer;
    }
    else
      writerOpt = cowfigOpt.writer;

    // Check if overwrite exist destination file
    if (((destMtime > cowfigFileList[i].mtime) && (writerOpt.overwrite === 'auto')) ||
        ((destMtime != 0) && (writerOpt.overwrite === 'never')))
      console.log('skipping: %j\r', destFile);
    else
      fileWriter(destFile, data, writerOpt.pretty);
  }
};

module.exports = entry();
