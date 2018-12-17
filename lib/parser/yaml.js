/* Node module requirement */
const fs = require('fs')
const path = require('path')

const yaml = require('js-yaml')
const traverse = require('traverse')

const override = require('../override')


/*
 * Module exports: Declare & Constructor
 */
class Plugin {
  constructor (config) {
    this.src = config.srcBase
    this.env = config.env
  }

  load (args) {
    let fn = args.fname, envPrefix = args.envPrefix
    let baseFile, baseData
    let envFile, envData, envMtime, envType
    let result = {'err': -1, 'data': ''}

    /* load base content */
    try {
      baseFile = path.resolve(this.src, fn)
      result.data = yaml.safeLoad(fs.readFileSync(baseFile, 'utf8'))
      result.data.__mtime = Date.parse(fs.statSync(baseFile).mtime)
      result.err = 0
    } catch (e) { return result }

    /* load env file */
    try {
      envFile = path.resolve(this.src, envPrefix + this.env, fn)
      envData = yaml.safeLoad(fs.readFileSync(envFile, 'utf8'))
      envMtime = Date.parse(fs.statSync(envFile).mtime)
      envType = envData.__override || 'override'
      delete envData.__override
      result.data = override(result.data, envData, envType)
      if (envMtime > result.data.__mtime)
        result.data.__mtime = envMtime
    } catch (e) { return result }

    return result
  }

  query (query, type, args) {
    let result = {'err': -1}

    let data = args
    if (type == 'file') {
      let _content = this.load(args)
      if (_content.err)
        return {'err': 404, 'data': 'FILE NOT FOUND'}

      data = _content.data
      result.cache = data
    }

    let _value
    if (query === '_') {
      _value = JSON.parse(JSON.stringify(data))
      delete _value.__mtime
    }
    else
      _value = traverse(data).get(query.split('.'))

    if (typeof _value !== 'undefined') {
      result.err = 0
      result.value = _value
    }

    return result
  }
}

module.exports = (config) => {
  return new Plugin(config)
}
