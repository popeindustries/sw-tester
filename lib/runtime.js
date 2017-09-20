(function() {
  window.addEventListener('load', () => {
    const frames = Array.from(document.querySelectorAll('.test-frame'));

    frames
      .reduce((chain, frame) => {
        resizeFrame(frame);

        return chain.then(() => {
          return frame.contentWindow.test().then(results => {
            console.log(results);
            resizeFrame(frame);
          });
        });
      }, Promise.resolve())
      .then(() => {
        console.log('done');
      });
  });

  function resizeFrame(frame) {
    frame.height = frame.contentWindow.document.documentElement.scrollHeight;
  }
})();
