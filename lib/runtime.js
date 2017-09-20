(function() {
  window.addEventListener('load', () => {
    const frames = Array.from(document.querySelectorAll('.test-frame'));
    const results = [];

    frames
      .reduce((chain, frame) => {
        resizeFrame(frame);

        return chain.then(() => {
          return frame.contentWindow.test().then(result => {
            results.push(result);
            resizeFrame(frame);
          });
        });
      }, Promise.resolve())
      .then(() => {
        console.log(results);
      });
  });

  function resizeFrame(frame) {
    frame.height = frame.contentWindow.document.documentElement.scrollHeight;
  }
})();
