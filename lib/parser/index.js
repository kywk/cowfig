/*
 * Module exports
 */
let Parser = require('./parser')
let parser = function (config) {
  let _config = config || {}
  let _parser = new Parser(_config)

  /* built-in format */
  // _parser.register('js', require('./js'))

  let json5 = require('./json5')(_config)
  _parser.register('json5', json5)
  _parser.register('json', json5)

  let xlsx = require('./xlsx')(_config)
  _parser.register('xlsx', xlsx)
  _parser.register('xls'. xlsx)

  let yaml = require('./yaml')(_config)
  _parser.register('yaml', yaml)
  _parser.register('yml', yaml)

  /* built-in macro */
  _parser.addMacro('SUM', require('./macro/sum'))

  /* built-in util */
  _parser.addUtil('override', require('../override'))
  _parser.addUtil('math', require('mathjs'))

  return _parser
}

module.exports = parser
