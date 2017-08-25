let fs = require('fs');
let path = require('path');

let Parser = require('../parser');
let writer = require('../writer');

const CWD = process.cwd() + '/';
let cowfigOpt = {
  env: process.env.NODE_ENV,
  envPrefix: '_',
  templateBase: CWD,
  parser: {
    srcBase: CWD + 'config/source/',
    override: 'override'
  },
  writer: {
    pretty: {
      maxLength: 128,
      indent: 2
    },
    destBase: CWD,
    overwrite: "auto",
    emptyObj: false,
    force: false
  }
};

function help () {
  console.log('usage: cowfig.js file -i SOURCE -o OUTPUT [-t TEMPLATE] [-s RESOURCE] [-e ENV]');
  process.exit(0);
};


function plugin (args, cowfig) {
  let parser, content;

  try {
    if (fs.statSync(args.i)) {
      // overwrite configure via arguments
      if (args.t) {
        cowfigOpt.templateBase = args.t;
        args.i = args.i.replace(args.t, '');
      }
      if (args.e)
        cowfigOpt.env = args.e;
      if (args.s)
        cowfigOpt.parser.srcBase = args.s;

      // convert relative path to absolute
      cowfigOpt.parser.srcBase = path.resolve(cowfigOpt.parser.srcBase) + '/';
      cowfigOpt.parser.templateBase = path.resolve(cowfigOpt.templateBase) + '/';
      cowfigOpt.parser.env = cowfigOpt.env;
      cowfigOpt.parser.envPrefix = cowfigOpt.envPrefix;

      parser = new Parser(cowfigOpt.parser);
      content = parser.parseFile(args.i);

      if (args.o)
        writer(content, args.o, cowfigOpt.writer);
      else {
        delete content.__mtime;
        delete content.__copy;
        delete content.__writer;
        console.log(content);
      }
    }
  }
  catch (e) {
    help();
  }
};

module.exports = plugin
