#!/usr/bin/env node
'use strict';

/**
 * Module dependencies.
 */
let fs = require('fs');
let path = require('path');
let minimist = require('minimist');

// cowfig core modules
let Parser = require('./lib/parser');
let finder = require('./lib/finder');
let writer = require('./lib/writer');

// cowfig modules
let override = require('./lib/util/override');


/**
 * Gloabl variable & default config
 */
const CWD = process.cwd() + '/';
let cowfigOpt = {
  env: process.env.NODE_ENV,
  envPrefix: '_',
  templateBase: CWD + 'config/template/',
  plugins: {
    console: [],
    util: []
  },
  consoleLog: {
    env: true,
    progress: true
  },
  finder: {
    ignore: ['EXAMPLE']
  },
  parser: {
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
    emptyObj: false,
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
    cowfigOpt.templateBase = args.t;
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
  cowfigOpt.templateBase = path.resolve(cowfigOpt.templateBase) + '/';
  cowfigOpt.writer.destBase = path.resolve(cowfigOpt.writer.destBase) + '/';


  /**
   * step 2: find cowfig file in templateBase
   */
  cowfigOpt.finder.envPrefix = cowfigOpt.envPrefix;
  cowfigFileList = finder(cowfigOpt.templateBase, cowfigOpt.finder);
  if (!cowfigFileList)
    usage();


  /**
   * step 3: parse cowfig, write out .json
   */
  cowfigOpt.parser.env = cowfigOpt.env;
  cowfigOpt.parser.templateBase = cowfigOpt.templateBase;
  cowfigOpt.parser.envPrefix = cowfigOpt.envPrefix;
  if (cowfigOpt.consoleLog.env) {
    console.log('---\r');
    console.log('Cowfig works with followed configuration:\r\n%j\r', cowfigOpt.parser);
    console.log('---\r');
  }
  let parser = new Parser(cowfigOpt.parser);

  // parse file in list, write out
  for (let i = 0; i < cowfigFileList.length; i++) {
    let data = parser.parseFile(cowfigFileList[i].fname);

    if (data.__mtime > cowfigFileList[i].mtime)
      cowfigFileList[i].mtime = data.__mtime;
    else
      data.__mtime = cowfigFileList[i].mtime;

    writer(data, cowfigFileList[i].fname, cowfigOpt.writer)
  }
};

module.exports = entry();
