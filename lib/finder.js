let fs = require('fs');

/**
 * find *.cowfig file under template
 */
function findCowfig (dir, prefix) {
  let result = [];

  try {
    if (fs.statSync(dir)) {
      fs.readdirSync(dir).forEach(function (file) {
        if (file.indexOf(prefix) == 0)
          return;

        file = dir + '/' + file;
        let stat = fs.statSync(file);

        if (stat && stat.isDirectory()) {
          result = result.concat(findCowfig(file, prefix))
        }
        else {
          if (file.match(/.*\.cowfig(\.json)?$/)) {
            let fstat = fs.statSync(file);
            result.push({
              fname: file.split('//').pop().split('.')[0],
              mtime: Date.parse(fstat.mtime)
            });
          }
        }
      });
    }
  }
  catch (e) { return null; }

  return result;
};

module.exports = findCowfig;
