function macro (args) {
  let result = 0
  for (let i = 0; i < args.length; i++) {
    let _i = parseFloat(args[i])
    if (isNaN(_i)) {
      console.log('SUM an non-number item')
      throw 'SUM an non-number item'
      return ''
    }
    result += _i
  }

  return result
}

module.exports = macro
