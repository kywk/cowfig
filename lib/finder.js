let fs = require('fs');

/**
 * find *.cowfig file under template
 */
function findCowfig (dir, opt) {
  let result = [], recursive;

  try {
    if (fs.statSync(dir)) {
      fs.readdirSync(dir).forEach(function (file) {

        if ((opt.ignore) && (opt.ignore.includes(file)))
          return;
        if ((opt.envPrefix) && (file.indexOf(opt.envPrefix) == 0))
          return;

        file = dir + '/' + file;
        let stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
          recursive = findCowfig(file, opt);
          if (recursive)
            result = result.concat(recursive);
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
  catch (e) { return; }

  return result;
};

module.exports = findCowfig;
