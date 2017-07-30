/* See LICENSE file for terms of use */
'use strict';

/* Node module requirement */
var fs = require('fs');
var path = require('path');

var XLSX = require('xlsx');
var traverse = require('traverse');


/**
 * Global variable & util function
 */


/**
 * getCell - get Cell format for idMap or Location specified
 *
 * @param  {object} idMap
 * @param  {string} idx
 * @return {object} {err, sheet, cell}
 */
var getCell = function (idMap, idx) {
  var result = {'err': -1, 'sheet': '', 'cell': {}};

  if (idx.charAt(0) === '#') {
    var _addr = idx.split(/\((-?\d*),(-?\d*)\)/);
    var _idx = idMap[_addr[0].slice(1)];

    var _tmp = _idx.split('.');

    var cell = XLSX.utils.decode_cell(_tmp[1]);
    if (_addr[1]) { cell.c += parseInt(_addr[1]); }
    if (_addr[2]) { cell.r += parseInt(_addr[2]); }

    result = {
      'err': 0,
      'sheet': _tmp[0],
      'cell': cell
    };
  }
  else {
    var _tmp = idx.split('.');
    result = {
      'err': 0,
      'sheet': _tmp[0],
      'cell': XLSX.utils.decode_cell(_tmp[1])
    };
  }

  return result;
};


/**
 * innerQuery
 *
 * @param  {object} data    -
 * @param  {object} range   -
 * @param  {string} query   -
 * @return {object}         -
 */
var innerQuery = function (data, range, query) {
  var result = [];

  var cellS = getCell(data.idMap, range.start);
  var cellE = getCell(data.idMap, range.end);

  var keysCol = query.split(/.*C\(([-,\w]*)\).*/)[1].split(',');
  var keysRow = query.split(/.*R\(([-,\w]*)\).*/)[1].split(',');

  var mapCol = {};
  for (var i = 0; i < keysCol.length; i++)
    mapCol[keysCol[i]] = [];
  for (var r = cellS.cell.r; r <= cellE.cell.r; r++) {
    var findCol = false;
    for (var c = cellS.cell.c; c <= cellE.cell.c; c++) {
      var _addr = XLSX.utils.encode_cell({c: c, r: r});
      var _data = traverse(data.data).get([cellS.sheet, _addr]);
      for (var i = 0; i < keysCol.length; i++) {
        if (_data == keysCol[i]) {
          mapCol[keysCol[i]].push(c);
          findCol = true;
        }
      }
    }
    if (findCol)
      break;
  }
  var isSingleCol = true;
  for (var key in mapCol) {
    if (mapCol[key].length > 1) {
      isSingleCol = false;
      break;
    }
  }

  var mapRow = {};
  for (var i = 0; i < keysRow.length; i++)
    mapRow[keysRow[i]] = [];
  for (var c = cellS.cell.c; c <= cellE.cell.c; c++) {
    var findRow = false;
    for (var r = cellS.cell.r; r <= cellE.cell.r; r++) {
      var _addr = XLSX.utils.encode_cell({c: c, r: r});
      var _data = traverse(data.data).get([cellS.sheet, _addr]);
      for (var i = 0; i < keysRow.length; i++) {
        if (_data == keysRow[i]) {
          mapRow[keysRow[i]].push(r);
          findRow = true;
        }
      }
    }
    if (findRow)
      break;
  }
  var isSingleRow = true;
  for (var key in mapRow) {
    if (mapRow[key].length > 1) {
      isSingleRow = false;
      break;
    }
  }

  // Row major
  if (/~/.test(query)) {
    var rows = [];
    var cols = [];

    // build major: row list
    for (var key in mapRow) {
      for (var i = 0; i < mapRow[key].length; i++) {
        rows.push(mapRow[key][i]);
      }
    }

    // build minor: column array
    if (isSingleCol) {
      var _list = [];
      for (var key in mapCol)
        _list.push(mapCol[key][0]);
      cols.push(_list);
    }
    else {
      for (var key in mapCol) {
        cols.push(mapCol[key]);
      }
    }

    for (var i = 0; i < rows.length; i++) {
      for (var j = 0; j < cols.length; j++) {
        var _data = [];
        for (var k = 0; k < cols[j].length; k++) {
          var _addr = XLSX.utils.encode_cell({'c': cols[j][k], 'r': rows[i]});
          var _value = traverse(data.data).get([cellS.sheet, _addr]);
          if (_value != null) { _data.push(_value); }
        }
        result.push(_data);
      }
    }
  }

  // Column major
  else {
    var rows = [];
    var cols = [];

    // build major: column list
    for (var key in mapCol) {
      for (var i = 0; i < mapCol[key].length; i++) {
        cols.push(mapCol[key][i]);
      }
    }

    // build minor: row array
    if (isSingleRow) {
      var _list = [];
      for (var key in mapRow)
        _list.push(mapRow[key][0]);
      rows.push(_list);
    }
    else {
      for (var key in mapRow) {
        rows.push(mapRow[key]);
      }
    }

    for (var i = 0; i < cols.length; i++) {
      for (var j = 0; j < rows.length; j++) {
        var _data = [];
        for (var k = 0; k < rows[j].length; k++) {
          var _addr = XLSX.utils.encode_cell({'c': cols[i], 'r': rows[j][k]});
          var _value = traverse(data.data).get([cellS.sheet, _addr]);
          if (_value != null) { _data.push(_value); }
        }
        result.push(_data);
      }
    }
  }

  // strip result
  if (result.length == 1) {
    result = result[0];
    if (result.length == 1) {
      result = result[0];
    }
  }

  return result;
};

/**
 * Module exports: Declare & Constructor
 */
var Plugin = function () {};
module.exports = new Plugin();

/**
 * Plugin.load
 *
 * @param  {Function} fn [description]
 * @return {[type]}      [description]
 */
Plugin.prototype.load = function (fn) {
  var result = {'err': -1, 'data': ''};

  try {
    var workbook = XLSX.readFile(fn);

    var data = traverse(workbook.Sheets).reduce(function (acc, x) {
      if (this.isLeaf && this.key == 'v') {
        traverse(acc).set(this.parent.path, this.node);
      }
      return acc;
    }, {});

    var idMap = traverse(data).reduce(function (acc, x) {
      if ((typeof(this.node) === 'string') &&
          (this.node.charAt(0) === '#')) {
        acc[this.node.slice(1).split(' ')[0]] = this.parent.key + '.' + this.key;
      }
      return acc;
    }, {});

    var idTable = {};
    for (var key in idMap) {
      var _end = 'END_' + key;
      if (idMap[_end]) {
        idTable[key] = {
          start: idMap[key],
          end: idMap[_end]
        };
      }
    }

    var cache = {
      data: data,
      idMap: idMap,
      idTable: idTable,
      __mtime: Date.parse(fs.statSync(fn).mtime)
    };

    result.data = cache
    result.err = 0;
  } catch (e) { /* console.log(e); */ }

  return result;
};


/**
 * Plugin.query
 *
 * @param  {[type]} query [description]
 * @param  {[type]} type  [description]
 * @param  {[type]} args  [description]
 * @return {[type]}       [description]
 */
Plugin.prototype.query = function (query, type, args) {
  var result = {'err': -1};
  query = query.replace(/\s/g, '')

  var data = args;
  if (type == 'file') {
    var _content = this.load(args);
    if (_content.err) {
      return {'err': 404, 'data': 'FILE NOT FOUND'};
    }

    data = _content.data;
    result.cache = data;
  }

  // Inner table query
  // Ex: #TABLE_NAME{C(Key), R(Key)}
  if ((/{(.*)}/).test(query)) {
    var _tmp = query.split(/{(.*)}/);
    var _tableName = _tmp[0].slice(1);
    if (data.idTable[_tableName]) {
      result.value = innerQuery(data, data.idTable[_tableName], _tmp[1]);
    }
    else {
      result.value = query;
    }
    result.err = 0;
    return result;
  }

  // Full file query
  if (!(/~|:/).test(query)) {
    var _cell = getCell(data.idMap, query);
    var _addr = XLSX.utils.encode_cell(_cell.cell);

    result.value = traverse(data.data).get([_cell.sheet, _addr]);
    result.err = 0;
    return result;
  }

  var _array = query.split(/~|:/);
  var cellS = getCell(data.idMap, _array[0]);
  var cellE = getCell(data.idMap, _array[_array.length - 1]);

  var rows = cellE.cell.r - cellS.cell.r + 1;
  var cols = cellE.cell.c - cellS.cell.c + 1;

  // One dimensional array
  if (((rows == 1) || (cols == 1)) && !(/~~|::/).test(query)) {
    result.value = [];
    for (var r = cellS.cell.r; r <= cellE.cell.r; r++) {
      for (var c = cellS.cell.c; c <= cellE.cell.c; c++) {
        var _addr = XLSX.utils.encode_cell({c: c, r: r});
        var _value = traverse(data.data).get([cellS.sheet, _addr]);
        if (_value != null) { result.value.push(_value); }
      }
    }

    result.err = 0;
    return result;
  }
  // Two dimensional array
  else {
    result.value = [];

    // Row major
    if (/~/.test(query)) {
      for (var r = 0; r < rows; r++) {
        result.value[r] = [];
        for (var c = 0; c < cols; c++) {
          var _addr = XLSX.utils.encode_cell({'c': cellS.cell.c + c, 'r': cellS.cell.r + r});
          var _value = traverse(data.data).get([cellS.sheet, _addr]);
          if (_value != null) { result.value[r].push(_value); }
        }
      }
    }

    // Column major
    else {
      for (var c = 0; c < cols; c++) {
        result.value[c] = [];
        for (var r = 0; r < rows; r++) {
          var _addr = XLSX.utils.encode_cell({'c': cellS.cell.c + c, 'r': cellS.cell.r + r});
          var _value = traverse(data.data).get([cellS.sheet, _addr]);
          if (_value != null) { result.value[c].push(_value); }
        }
      }
    }

    result.err = 0;
    return result;
  }
};
