(function() {
window.createTestFrame = createTestFrame;

function createTestFrame(testpath) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');

    iframe.classList.add('test-frame');
    iframe.addEventListener('load', () => {
      resolve(iframe);
    });
    iframe.src = `/test/frame/${Date.now()}?file=${testpath}`;
    document.body.appendChild(iframe);
  });
}
})();
