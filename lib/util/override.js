function isObjectAndNotArray (object) {
  return (typeof object === 'object' && !Array.isArray(object));
}

function overrideKeys (baseObj, overrideObj, type) {
  type = type || 'override';

  if (type === 'replace') {
    delete overrideObj.__override;
    return overrideObj;
  }

  let result = baseObj;
  Object.keys(overrideObj).forEach(function (key) {
    if (isObjectAndNotArray(baseObj[key]) && isObjectAndNotArray(overrideObj[key])) {
      overrideKeys(baseObj[key], overrideObj[key], type);
    }
    else {
      if (((baseObj[key]) && (overrideObj[key])) || (type === 'override'))
        baseObj[key] = overrideObj[key];
    }
  });

  delete result.__override;
  return result;
}

module.exports = overrideKeys;
