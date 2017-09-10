const inline = require('./inline');

module.exports = function test(ctx) {
  return new Promise(async (resolve, reject) => {
    resolve(render(ctx.state));
  });
};

function render(data) {
  return `
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1">
    <title>Test Frame</title>
    <style id="mochaCSS">${inline('node_modules/mocha/mocha.css')}</style>
    <script id="mochaJS">${inline('node_modules/mocha/mocha.js')}</script>
    <script id="chai">${inline('node_modules/chai/chai.js')}</script>
    <script>
    mocha.setup("bdd");
    mocha.timeout = 4000;
    </script>
    <script src="${data.file}"></script>
  </head>

  <body>
    <div id="mocha"></div>
    <script>
      const results = mocha.run();
      results.on('end', () => {
      });
    </script>
  </body>
</html>
`;
}

