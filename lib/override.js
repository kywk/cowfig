function isObjectAndNotArray (object) {
  return (typeof object === 'object' && !Array.isArray(object))
}

function overrideKeys (baseObj, overrideObj, type) {
  type = type || 'override'

  if (type === 'replace')
    return overrideObj

  let result = JSON.parse(JSON.stringify(baseObj))
  Object.keys(overrideObj).forEach(function (key) {
    if (isObjectAndNotArray(baseObj[key]) && isObjectAndNotArray(overrideObj[key]))
      result[key] = overrideKeys(baseObj[key], overrideObj[key], type)
    else {
      if (((baseObj[key]) && (overrideObj[key])) || (type === 'override'))
        result[key] = overrideObj[key]
    }
  })

  return result
}

module.exports = overrideKeys
