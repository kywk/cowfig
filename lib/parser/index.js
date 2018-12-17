/*
 * Module exports
 */
const Parser = require('./parser')

let parserBuilder = (config) => {
  config = config || {}
  let _parser = new Parser(config)

  /* built-in format */
  // _parser.register('js', require('./js'))

  let json5 = require('./json5')(config)
  _parser.register('json5', json5)
  _parser.register('json', json5)

  let xlsx = require('./xlsx')(config)
  _parser.register('xlsx', xlsx)
  _parser.register('xls'. xlsx)

  let yaml = require('./yaml')(config)
  _parser.register('yaml', yaml)
  _parser.register('yml', yaml)

  /* built-in macro */
  _parser.addMacro('SUM', require('./macro/sum'))

  /* built-in util */
  _parser.addUtil('override', require('../override'))
  _parser.addUtil('math', require('mathjs'))

  return _parser
}

module.exports = parserBuilder
