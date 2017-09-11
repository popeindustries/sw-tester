'use strict';

const fs = require('fs');
const path = require('path');

module.exports = function inline(filepath) {
  if (!path.isAbsolute(filepath)) {
    filepath = path.resolve(path.dirname(__dirname), filepath);
  }
  return fs.readFileSync(filepath, 'utf8').replace(/(<)(\/script>)/g, '\\x3C$2');
};
