/* See LICENSE file for terms of use */
'use strict';

/* Node module requirement */
let fs = require('fs');
let path = require('path');

let XLSX = require('xlsx');
let traverse = require('traverse');


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
let getCell = function (idMap, idx) {
  let result = {'err': -1, 'sheet': '', 'cell': {}};

  if (idx.charAt(0) === '#') {
    let _addr = idx.split(/\((-?\d*),(-?\d*)\)/);
    let _idx = idMap[_addr[0].slice(1)];

    let _tmp = _idx.split('.');

    let cell = XLSX.utils.decode_cell(_tmp[1]);
    if (_addr[1]) { cell.c += parseInt(_addr[1]); }
    if (_addr[2]) { cell.r += parseInt(_addr[2]); }

    result = {
      'err': 0,
      'sheet': _tmp[0],
      'cell': cell
    };
  }
  else {
    let _tmp = idx.split('.');
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
let innerQuery = function (data, range, query) {
  let result = [];

  let cellS = getCell(data.idMap, range.start);
  let cellE = getCell(data.idMap, range.end);

  let keysCol = query.split(/.*C\(([-,\w]*)\).*/)[1].split(',');
  let keysRow = query.split(/.*R\(([-,\w]*)\).*/)[1].split(',');

  let mapCol = {};
  for (let i = 0; i < keysCol.length; i++)
    mapCol[keysCol[i]] = [];
  for (let r = cellS.cell.r; r <= cellE.cell.r; r++) {
    let findCol = false;
    for (let c = cellS.cell.c; c <= cellE.cell.c; c++) {
      let _addr = XLSX.utils.encode_cell({c: c, r: r});
      let _data = traverse(data.data).get([cellS.sheet, _addr]);
      for (let i = 0; i < keysCol.length; i++) {
        if (_data == keysCol[i]) {
          mapCol[keysCol[i]].push(c);
          findCol = true;
        }
      }
    }
    if (findCol)
      break;
  }
  let isSingleCol = true;
  for (let key in mapCol) {
    if (mapCol[key].length > 1) {
      isSingleCol = false;
      break;
    }
  }

  let mapRow = {};
  for (let i = 0; i < keysRow.length; i++)
    mapRow[keysRow[i]] = [];
  for (let c = cellS.cell.c; c <= cellE.cell.c; c++) {
    let findRow = false;
    for (let r = cellS.cell.r; r <= cellE.cell.r; r++) {
      let _addr = XLSX.utils.encode_cell({c: c, r: r});
      let _data = traverse(data.data).get([cellS.sheet, _addr]);
      for (let i = 0; i < keysRow.length; i++) {
        if (_data == keysRow[i]) {
          mapRow[keysRow[i]].push(r);
          findRow = true;
        }
      }
    }
    if (findRow)
      break;
  }
  let isSingleRow = true;
  for (let key in mapRow) {
    if (mapRow[key].length > 1) {
      isSingleRow = false;
      break;
    }
  }

  // Row major
  if (/~/.test(query)) {
    let rows = [];
    let cols = [];

    // build major: row list
    for (let key in mapRow) {
      for (let i = 0; i < mapRow[key].length; i++) {
        rows.push(mapRow[key][i]);
      }
    }

    // build minor: column array
    if (isSingleCol) {
      let _list = [];
      for (let key in mapCol)
        _list.push(mapCol[key][0]);
      cols.push(_list);
    }
    else {
      for (let key in mapCol) {
        cols.push(mapCol[key]);
      }
    }

    for (let i = 0; i < rows.length; i++) {
      for (let j = 0; j < cols.length; j++) {
        let _data = [];
        for (let k = 0; k < cols[j].length; k++) {
          let _addr = XLSX.utils.encode_cell({'c': cols[j][k], 'r': rows[i]});
          let _value = traverse(data.data).get([cellS.sheet, _addr]);
          if (_value != null) { _data.push(_value); }
        }
        result.push(_data);
      }
    }
  }

  // Column major
  else {
    let rows = [];
    let cols = [];

    // build major: column list
    for (let key in mapCol) {
      for (let i = 0; i < mapCol[key].length; i++) {
        cols.push(mapCol[key][i]);
      }
    }

    // build minor: row array
    if (isSingleRow) {
      let _list = [];
      for (let key in mapRow)
        _list.push(mapRow[key][0]);
      rows.push(_list);
    }
    else {
      for (let key in mapRow) {
        rows.push(mapRow[key]);
      }
    }

    for (let i = 0; i < cols.length; i++) {
      for (let j = 0; j < rows.length; j++) {
        let _data = [];
        for (let k = 0; k < rows[j].length; k++) {
          let _addr = XLSX.utils.encode_cell({'c': cols[i], 'r': rows[j][k]});
          let _value = traverse(data.data).get([cellS.sheet, _addr]);
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
let Plugin = function (config) {
  this.src = config.srcBase;
  this.env = config.env;
};
module.exports = function (config) {
  return new Plugin(config);
};

/**
 * Plugin.load
 *
 * @param  {Object} args {fname, envPrefix}
 * @return {[type]}      [description]
 */
Plugin.prototype.load = function (args) {
  let fn = args.fname, envPrefix = args.envPrefix;
  let xlsFile, xlsStat, workbook;
  let result = {'err': -1, 'data': ''};

  // try env file first
  try {
    xlsFile = path.resolve(this.src, envPrefix + this.env, fn);
    xlsStat = fs.statSync(xlsFile);
    if (xlsStat && !xlsStat.isDirectory())
      workbook = XLSX.readFile(xlsFile);
  } catch (e) {}

  // try base file
  if (!workbook) {
    try {
      xlsFile = path.resolve(this.src, fn);
      xlsStat = fs.statSync(xlsFile);
      if (xlsStat && !xlsStat.isDirectory())
        workbook = XLSX.readFile(xlsFile);
    } catch (e) { return result; }
  }

  let data = traverse(workbook.Sheets).reduce(function (acc, x) {
    if (this.isLeaf && this.key == 'v') {
      traverse(acc).set(this.parent.path, this.node);
    }
    return acc;
  }, {});

  let idMap = traverse(data).reduce(function (acc, x) {
    if ((typeof(this.node) === 'string') &&
        (this.node.charAt(0) === '#')) {
      acc[this.node.slice(1).split(' ')[0]] = this.parent.key + '.' + this.key;
    }
    return acc;
  }, {});

  let idTable = {};
  for (let key in idMap) {
    let _end = 'END_' + key;
    if (idMap[_end]) {
      idTable[key] = {
        start: idMap[key],
        end: idMap[_end]
      };
    }
  }

  let cache = {
    data: data,
    idMap: idMap,
    idTable: idTable,
    __mtime: Date.parse(fs.statSync(xlsFile).mtime)
  };

  result.data = cache
  result.err = 0;
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
  let result = {'err': -1};
  query = query.replace(/\s/g, '')

  let data = args;
  if (type == 'file') {
    let _content = this.load(args);
    if (_content.err) {
      return {'err': 404, 'data': 'FILE NOT FOUND'};
    }

    data = _content.data;
    result.cache = data;
  }

  // Inner table query
  // Ex: #TABLE_NAME{C(Key), R(Key)}
  if ((/{(.*)}/).test(query)) {
    let _tmp = query.split(/{(.*)}/);
    let _tableName = _tmp[0].slice(1);
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
    let _cell = getCell(data.idMap, query);
    let _addr = XLSX.utils.encode_cell(_cell.cell);

    result.value = traverse(data.data).get([_cell.sheet, _addr]);
    result.err = 0;
    return result;
  }

  let _array = query.split(/~|:/);
  let cellS = getCell(data.idMap, _array[0]);
  let cellE = getCell(data.idMap, _array[_array.length - 1]);

  let rows = cellE.cell.r - cellS.cell.r + 1;
  let cols = cellE.cell.c - cellS.cell.c + 1;

  // One dimensional array
  if (((rows == 1) || (cols == 1)) && !(/~~|::/).test(query)) {
    result.value = [];
    for (let r = cellS.cell.r; r <= cellE.cell.r; r++) {
      for (let c = cellS.cell.c; c <= cellE.cell.c; c++) {
        let _addr = XLSX.utils.encode_cell({c: c, r: r});
        let _value = traverse(data.data).get([cellS.sheet, _addr]);
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
      for (let r = 0; r < rows; r++) {
        result.value[r] = [];
        for (let c = 0; c < cols; c++) {
          let _addr = XLSX.utils.encode_cell({'c': cellS.cell.c + c, 'r': cellS.cell.r + r});
          let _value = traverse(data.data).get([cellS.sheet, _addr]);
          if (_value != null) { result.value[r].push(_value); }
        }
      }
    }

    // Column major
    else {
      for (let c = 0; c < cols; c++) {
        result.value[c] = [];
        for (let r = 0; r < rows; r++) {
          let _addr = XLSX.utils.encode_cell({'c': cellS.cell.c + c, 'r': cellS.cell.r + r});
          let _value = traverse(data.data).get([cellS.sheet, _addr]);
          if (_value != null) { result.value[c].push(_value); }
        }
      }
    }

    result.err = 0;
    return result;
  }
};
