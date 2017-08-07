/* See LICENSE file for terms of use */
'use strict';

/* Node module requirement */
let fs = require('fs');
let path = require('path');

let JSON5 = require('json5');
let traverse = require('traverse');

let override = require('../util/override');


/**
 * Module exports: Declare & Constructor
 */
let Plugin = function (config) {
  this.src = config.srcBase;
  this.env = config.env;
};
module.exports = function (config) {
  return new Plugin(config);
};


Plugin.prototype.load = function (fn) {
  let baseFile, baseData;
  let envFile, envData, envMtime, envType;
  let result = {'err': -1, 'data': ''};

  // load base content
  try {
    baseFile = path.resolve(this.src, fn);
    baseData = fs.readFileSync(baseFile, 'utf8');
    result.data = JSON5.parse(baseData);
    result.data.__mtime = Date.parse(fs.statSync(baseFile).mtime);
    result.err = 0;
  } catch (e) { return result }

  // load env file
  try {
    envFile = path.resolve(this.src, this.env, fn);
    envData = fs.readFileSync(envFile, 'utf8');
    envData = JSON5.parse(envData);
    envMtime = Date.parse(fs.statSync(envFile).mtime);
    envType = envData.__override || 'override';
    delete envData.__override;
    result.data = override(result.data, envData, envType);
    if (envMtime > result.data.__mtime)
      result.data.__mtime = envMtime;
  } catch (e) { return result }

  return result;
};


Plugin.prototype.query = function (query, type, args) {
  let result = {'err': -1};

  let data = args;
  if (type == 'file') {
    let _content = this.load(args);
    if (_content.err)
      return {'err': 404, 'data': 'FILE NOT FOUND'};

    data = _content.data;
    result.cache = data;
  }

  let _value = traverse(data).get(query.split('.'));
  if (typeof _value !== 'undefined') {
    result.value = _value;
    result.err = 0;
  }

  return result;
};
