/* See LICENSE file for terms of use */
'use strict';

/**
 * Module exports
 */
var Parser = require('./parser');
var parser = function (config) {

  var _config = config || {};
  var _parser = new Parser(_config);

  // built-in format
  // _parser.register('js', require('./js'));

  var json5 = require('./json5')(_config);
  _parser.register('json5', json5);
  _parser.register('json', json5);

  var xlsx = require('./xlsx')(_config);
  _parser.register('xlsx', xlsx);
  _parser.register('xls'. xlsx);

  return _parser;
}

module.exports = parser;
