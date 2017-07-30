/* See LICENSE file for terms of use */
'use strict';

/* Node module requirement */
var fs = require('fs');
var path = require('path');
var JSON5 = require('json5');
var stringify = require('json-stringify-pretty-compact');

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
  var stats = statPath(requestPath);
  if (stats && !stats.isDirectory()) {
    return fs.realpathSync(requestPath);
  }
  return false;
}

// given a path check a the file exists with any of the set extensions
function tryExtensions (p, exts) {
  for (var i = 0, EL = exts.length; i < EL; i++) {
    var filename = tryFile(p + exts[i]);

    if (filename) {
      return filename;
    }
  }
  return false;
}


var getArgs = function (argsStr) {
  var result = [];

  var idx;

  // get fname
  var fn = '';
  for (idx = 1; idx < argsStr.length; idx++) {
    var char = argsStr.charAt(idx);
    if (char == '(')
      break;
    fn += char;
  }
  result.push(fn);

  // get args
  var args = '';
  var degree = 0;
  for (++idx; idx < argsStr.length; idx++) {
    var char = argsStr.charAt(idx);

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

var traverseData = function (base, env, type) {
  var result = {};

  if (!env)
    env = {};

  // patch
  for (var key in base) {
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
var Parser = function (config) {
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
  var baseData, envData, template;

  var _baseFile = tryExtensions(path.resolve(this._templateBase, filename), this._exts);
  if (_baseFile) {
    try {
      var _content = fs.readFileSync(_baseFile, 'utf8');
      baseData = JSON5.parse(_content);
      this.mtime = Date.parse(fs.statSync(_baseFile).mtime);
    } catch (e) { console.log(e); }
  }

  var _envFile = tryExtensions(path.resolve(this._env, filename), this._exts);
  if (_envFile) {
    try {
      var _content = fs.readFileSync(_envFile, 'utf8');
      envData = JSON5.parse(_content);
      var _mtime = Date.parse(fs.statSync(_baseFile).mtime);
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

  var data = this.parse(template, {isRoot: true, filename: filename});
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
  var _root, _mtime;

  // Process macro once
  if (!root.isRoot) {
    _root = root;
  } else {
    _root = {isRoot: false, macro: {}};
    if (template.__macro) {
      for (var i = 0; i < template.__macro.length; i++) {
        _mtime = Date.parse(fs.statSync(this._templateBase + template.__macro[i].src).mtime);
        if (_mtime > this.mtime)
          this.mtime = _mtime;
        _root.macro[template.__macro[i].fname] = require(this._templateBase + template.__macro[i].src);
      }
    }
  }

  var result = {};

  for (var key in template) {
    var _key = key;

    if (replacement !== undefined) {
      _key = _key.replace(/__key__/g, replacement);
    }

    if ((key == '__macro') || (key == '__post')) {
      continue;
    }

    if (template.__copy) {
      var fn = template.__copy;
      var envfn = this._env + '/' + fn;
      var files = [this._srcBase + envfn, this._srcBase + fn];
      result.__copy = template.__copy;
      for (let i = 0; i < files.length; i++) {
        let filename = tryFile(files[i]);
        if (filename) {
          result.__content = fs.readFileSync(filename, 'utf8');
          break;
        }
      }
      continue;
    }

    if (key.slice(0,7) === '__for__') {
      var keys;
      if (key.slice(7,8) === '@') {
        keys = template[key.slice(8)];
        delete result[key.slice(8)];
        delete template[key.slice(8)];
      } else {
        keys = this.query(key.slice(7), _root.macro);
      }

      var length = keys.length;

      if ((template[key] instanceof Object) && !(template[key] instanceof Array)) {
        for (var i = 0; i < length; i++) {
          result[keys[i]] = this.parse(template[key], _root, keys[i]);
        }
        continue;
      }

      for (var i = 0; i < length; i++) {
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
      var length = template[key].length;
      for (var i = 0; i < length; i++) {
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
    var _fn = root.filename.split('/');
    _fn.pop();
    var _base = _fn.join('/') + '/';
    for (var i = 0; i < template.__post.length; i++) {
      _mtime = Date.parse(fs.statSync(this._templateBase + _base + template.__post[i]).mtime);
      if (_mtime > this.mtime)
        this.mtime = _mtime;
      var fn = require(this._templateBase + _base + template.__post[i]);
      result = fn(result);
    }
  }

  // Execute post process
  return result;
};


Parser.prototype.parseString = function (template, root, prettyOptions) {
  var result = this.parse(template, root);
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
  var _queryStr = queryStr;

  if (typeof _queryStr === 'string') {

    if (replacement !== undefined) {
      _queryStr = _queryStr.replace(/__key__/g, replacement);
    }

    // $ - on-the-fly macro processing
    if (_queryStr.slice(0, 1) == '#') {
      _queryStr = _queryStr.replace(/\s/g, '');

      var args = getArgs(_queryStr);
      for (var i = 1; i < args.length; i++)
        args[i] = this.query(args[i], macro);
      var fname = args.shift();

      if (macro[fname])
        return macro[fname](args);
      else
        return _queryStr;
    }

    // % - file parser plugin
    else if (_queryStr.slice(0, 1) == '%') {
      _queryStr = _queryStr.replace(/\s/g, '');

      var _tmp = _queryStr.split('?');
      var fn = _tmp[0].slice(1, _tmp[0].length);
      var query = _tmp[1];
      var ext = fn.split('.')[1];

      if (this.fmt[ext]) {
        var _result;

        // Load $ENV value set
        var envfn = this._env + '/' + fn;

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
