let fs = require('fs')
let path = require('path')

let finder = require('../finder')

const CWD = process.cwd() + '/'
let cowfigOpt = {
  env: process.env.NODE_ENV,
  envPrefix: '_',
  templateBase: CWD
}


function help () {
  console.log('usage: cowfig.js clean [-t TEMPLATE] [-d DESTINATION]')
  process.exit(0)
}


function plugin (args, cowfigOpt) {
  let templateBase = (args.t) ? args.t : cowfigOpt.templateBase
  let destBase = (args.d) ? args.d : cowfigOpt.writer.destBase
  let cowfigFileList

  templateBase = path.resolve(templateBase) + '/'
  destBase = path.resolve(destBase) + '/'

  cowfigOpt.finder.envPrefix = cowfigOpt.envPrefix
  cowfigFileList = finder(templateBase, cowfigOpt.finder)

  if ((!cowfigFileList) || (cowfigFileList.length == 0))
    help()

  for (let i = 0; i < cowfigFileList.length; i++) {
    let destFile = path.resolve(destBase, cowfigFileList[i].fname) + '.json'
    try {
      fs.unlinkSync(destFile)
      console.log('cleanup:', destFile)
    }
    catch (e) {
      console.log('skiping fail:', destFile)
    }
  }
}

module.exports = plugin
