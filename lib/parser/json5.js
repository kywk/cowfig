/* See LICENSE file for terms of use */
'use strict';

/* Node module requirement */
var fs = require('fs');
var path = require('path');

var JSON5 = require('json5');
var traverse = require('traverse');


/**
 * Module exports: Declare & Constructor
 */
var Plugin = function () {};
module.exports = new Plugin();


Plugin.prototype.load = function (fn) {
  var result = {'err': -1, 'data': ''};

  try {
    var _content = fs.readFileSync(fn, 'utf8');
    result.data = JSON5.parse(_content);
    result.data.__mtime = Date.parse(fs.statSync(fn).mtime);
    result.err = 0;
  } catch (e) { /* console.log(e) */ }

  return result;
};


Plugin.prototype.query = function (query, type, args) {
  var result = {'err': -1};

  var data = args;
  if (type == 'file') {
    var _content = this.load(args);
    if (_content.err)
      return {'err': 404, 'data': 'FILE NOT FOUND'};

    data = _content.data;
    result.cache = data;
  }

  var _value = traverse(data).get(query.split('.'));
  if (typeof _value !== 'undefined') {
    result.value = _value;
    result.err = 0;
  }

  return result;
};
