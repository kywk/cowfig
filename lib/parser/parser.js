/* See LICENSE file for terms of use */
'use strict';

/* Node module requirement */
let fs = require('fs');
let path = require('path');
let JSON5 = require('json5');
let stringify = require('json-stringify-pretty-compact');

/* CONSTANT, Configuration, Global variable */

// Modeled off of (v0.6.18 link; check latest too):
// Origin source: https://github.com/joyent/node/blob/v0.6.18/lib/module.js
//
// given a module name, and a list of paths to test, returns the first
// matching file in the following precedence.
//
// require("a.<ext>")
//   -> a.<ext>
//
// require("a")
//   -> a
//   -> a.<ext>
//   -> a/index.<ext>

function statPath(path) {
  try {
    return fs.statSync(path);
  } catch (ex) {}
  return false;
}

// check if the file exists and is not a directory
function tryFile (requestPath) {
  let stats = statPath(requestPath);
  if (stats && !stats.isDirectory()) {
    return fs.realpathSync(requestPath);
  }
  return false;
}

// given a path check a the file exists with any of the set extensions
function tryExtensions (p, exts) {
  for (let i = 0, EL = exts.length; i < EL; i++) {
    let filename = tryFile(p + exts[i]);

    if (filename) {
      return filename;
    }
  }
  return false;
}


let getArgs = function (argsStr) {
  let result = [];

  let idx;

  // get fname
  let fn = '';
  for (idx = 1; idx < argsStr.length; idx++) {
    let char = argsStr.charAt(idx);
    if (char == '(')
      break;
    fn += char;
  }
  result.push(fn);

  // get args
  let args = '';
  let degree = 0;
  for (++idx; idx < argsStr.length; idx++) {
    let char = argsStr.charAt(idx);

    if (((char == ',') || (char == ')')) && (degree == 0)) {
      result.push(args);
      args = '';
    } else {
      args += char;
    }

    if (char == '(')
      degree++;
    if (char == ')')
      degree--;
  }

  return result;
};

let traverseData = function (base, env, type) {
  let result = {};

  if (!env)
    env = {};

  // patch
  for (let key in base) {
    if ((base[key] instanceof Object) && !(base[key] instanceof Array)) {
      result[key] = traverseData(base[key], env[key], type);
    }
    else {
      if (env[key])
        result[key] = env[key];
      else
        result[key] = base[key];
    }
  }

  if (type == 'override') {
    for (key in env) {
      if (!result[key])
        result[key] = env[key];
    }
  }

  return result;
};


/**
 * Module exports: Declare & Constructor
 */
let Parser = function (config) {
  this._exts = ['', '.cowfig', '.cowfig.json'];

  if (config.srcBase) {
    if (config.srcBase.slice(-1) === '/')
      this._srcBase = config.srcBase;
    else
      this._srcBase = config.srcBase + '/';
  } else {
    this._srcBase = process.cwd() + '/config/';
  }

  if (config.templateBase) {
    if (config.templateBase.slice(-1) === '/')
      this._templateBase = config.templateBase;
    else
      this._templateBase = config.templateBase + '/';
  } else {
    this._templateBase = this._srcBase + 'template/';
  }

  this._env = config.env || 'development';
  this._type = config.type || 'override';

  // supported file formats
  this.fmt = {};
  // cached file content
  this.db = {};

  this.mtime = 0;
};
module.exports = Parser;



Parser.prototype.register = function (ext, parser) {
  if (!parser)
    return null;
  if ((parser.query) && (typeof(parser.query) === 'function'))
    this.fmt[ext] = parser;
};



/**
 * parseFile
 *
 * @param  {string} filename
 * @return {object}
 */
Parser.prototype.parseFile = function (filename) {
  let baseData, envData, template;

  let _baseFile = tryExtensions(path.resolve(this._templateBase, filename), this._exts);
  if (_baseFile) {
    try {
      let _content = fs.readFileSync(_baseFile, 'utf8');
      baseData = JSON5.parse(_content);
      this.mtime = Date.parse(fs.statSync(_baseFile).mtime);
    } catch (e) { console.log(e); }
  }

  let _envFile = tryExtensions(path.resolve(this._env, filename), this._exts);
  if (_envFile) {
    try {
      let _content = fs.readFileSync(_envFile, 'utf8');
      envData = JSON5.parse(_content);
      let _mtime = Date.parse(fs.statSync(_baseFile).mtime);
      if (_mtime > this.mtime)
        this.mtime = _mtime;
    } catch (e) { console.log(e); }
  }

  if (this._type == 'replace')
    template = envData || {};
  else if (baseData)
    template = traverseData(baseData, envData, this._type);
  else
    template = {};

  let data = this.parse(template, {isRoot: true, filename: filename});
  data.__mtime = this.mtime;

  return data;
};


/**
 * Parser.parse
 *
 * @param  {object} template
 * @return {object}
 *
 * TODO:
 * - error handler, logger
 */
Parser.prototype.parse = function (template, root, replacement) {
  let _root, _mtime;

  // Process macro once
  if (!root.isRoot) {
    _root = root;
  } else {
    _root = {isRoot: false, macro: {}};
    if (template.__macro) {
      for (let i = 0; i < template.__macro.length; i++) {
        _mtime = Date.parse(fs.statSync(this._templateBase + template.__macro[i].src).mtime);
        if (_mtime > this.mtime)
          this.mtime = _mtime;
        _root.macro[template.__macro[i].fname] = require(this._templateBase + template.__macro[i].src);
      }
    }
  }

  let result = {};

  for (let key in template) {
    let _key = key;

    if (replacement !== undefined) {
      _key = _key.replace(/__key__/g, replacement);
    }

    if ((key == '__macro') || (key == '__post')) {
      continue;
    }

    // builtin POST process: COPY
    if (key == '__copy') {
      result.__copy = [];

      for (let i = 0; i < template.__copy.length; i++) {
        let fn = template.__copy[i].src;
        let envfn = this._env + '/' + fn;
        let files = [this._srcBase + envfn, this._srcBase + fn];
        for (let j = 0; j < files.length; j++) {
          let filename = tryFile(files[i]);
          if (filename) {
            result.__copy.push({src: filename, dest: template.__copy[i].dest});
            break;
          }
        }
      }
      continue;
    }

    if (key.slice(0,7) === '__for__') {
      let keys;
      if (key.slice(7,8) === '@') {
        keys = template[key.slice(8)];
        delete result[key.slice(8)];
        delete template[key.slice(8)];
      } else {
        keys = this.query(key.slice(7), _root.macro);
      }

      let length = keys.length;

      if ((template[key] instanceof Object) && !(template[key] instanceof Array)) {
        for (let i = 0; i < length; i++) {
          result[keys[i]] = this.parse(template[key], _root, keys[i]);
        }
        continue;
      }

      for (let i = 0; i < length; i++) {
        if (typeof template[key] === 'string') {
          result[keys[i]] = this.query(template[key].replace(/__key__/g, keys[i]), _root.macro, keys[i]);
          continue;
        }

        result[keys[i]] = this.query(template[key], _root.macro, keys[i]);
      }
      continue;
    }

    if (template[key] instanceof Array && template[key][0] instanceof Object && !(template[key][0] instanceof Array)) {
      result[_key] = [];
      let length = template[key].length;
      for (let i = 0; i < length; i++) {
        result[_key][i] = this.parse(template[key][i], _root, replacement);
      }
      continue;
    }

    if ((template[key] instanceof Object) && !(template[key] instanceof Array)) {
      result[_key] = this.parse(template[key], _root, replacement);
      continue;
    }

    if (replacement !== undefined && typeof template[key] === 'string') {
      result[_key] = this.query(template[key].replace(/__key__/g, replacement), _root.macro, replacement);
    }

    result[_key] = this.query(template[key], _root.macro, replacement);
  }

  if ((root.isRoot) && (template.__post)) {
    let _fn = root.filename.split('/');
    _fn.pop();
    let _base = _fn.join('/') + '/';
    for (let i = 0; i < template.__post.length; i++) {
      _mtime = Date.parse(fs.statSync(this._templateBase + _base + template.__post[i]).mtime);
      if (_mtime > this.mtime)
        this.mtime = _mtime;
      let fn = require(this._templateBase + _base + template.__post[i]);
      result = fn(result);
    }
  }

  // Execute post process
  return result;
};


Parser.prototype.parseString = function (template, root, prettyOptions) {
  let result = this.parse(template, root);
  return stringify(result, prettyOptions);
};

Parser.prototype.stringify = function (obj, options) {
  return stringify(obj, options);
};


/**
 * Parser.query
 *
 * @param  {string} query
 * @return {object}
 */
Parser.prototype.query = function (queryStr, macro, replacement) {
  let _queryStr = queryStr;

  if (typeof _queryStr === 'string') {

    if (replacement !== undefined) {
      _queryStr = _queryStr.replace(/__key__/g, replacement);
    }

    // $ - on-the-fly macro processing
    if (_queryStr.slice(0, 1) == '#') {
      _queryStr = _queryStr.replace(/\s/g, '');

      let args = getArgs(_queryStr);
      for (let i = 1; i < args.length; i++)
        args[i] = this.query(args[i], macro);
      let fname = args.shift();

      if (macro[fname])
        return macro[fname](args);
      else
        return _queryStr;
    }

    // % - file parser plugin
    else if (_queryStr.slice(0, 1) == '%') {
      _queryStr = _queryStr.replace(/\s/g, '');

      let _tmp = _queryStr.split('?');
      let fn = _tmp[0].slice(1, _tmp[0].length);
      let query = _tmp[1];
      let ext = fn.split('.')[1];

      if (this.fmt[ext]) {
        let _result;

        // Load $ENV value set
        let envfn = this._env + '/' + fn;

        if (this.db[envfn])
          _result = this.fmt[ext].query(query, 'cache', this.db[envfn]);
        else
          _result = this.fmt[ext].query(query, 'file', this._srcBase + envfn);

        if (_result.cache)
          this.db[envfn] = _result.cache;

        if ((_result) && (!_result.err)) {
          return _result.value;
        }

        // Load $Base value set
        if (this.db[fn])
          _result = this.fmt[ext].query(query, 'cache', this.db[fn]);
        else
          _result = this.fmt[ext].query(query, 'file', this._srcBase + fn);

        if (_result.cache) {
          this.db[fn] = _result.cache;
          if (_result.cache.__mtime > this.mtime)
            this.mtime = _result.cache.__mtime;
        }

        if ((_result) && (!_result.err))
          return _result.value;
      }
    }
  }

  return _queryStr;
};
