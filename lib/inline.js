'use strict';

const fs = require('fs');
const path = require('path');

module.exports = function inline(filepath) {
  return fs.readFileSync(path.resolve(process.cwd(), filepath), 'utf8').replace(/(<)(\/script>)/g, '\\x3C$2');
};
