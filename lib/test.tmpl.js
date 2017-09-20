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
    <title>Test</title>
    <style>${inline('lib/runtime.css')}</style>
    <script>${inline('lib/runtime.js')}</script>
  </head>

  <body>
  ${renderFrames(data.files)}
  </body>
</html>
`;
}

function renderFrames(files) {
  let frames = '';

  files.forEach((file, idx) => {
    frames += `<iframe width="100%" class="test-frame" src="/test/frame/${Date.now() + idx}?file=${file}"></iframe>`;
  });

  return frames;
}
