const MESSAGES = {
  hostData: 'hostData',
  listenAlongUpdate: 'listenAlongUpdate',
};

window.addEventListener('message', e => {
  if (e.source !== window) return;

  const msg = e.data;

  if (msg.type === MESSAGES.hostData) {
    browser.runtime.sendMessage({ data: msg.data, type: MESSAGES.listenAlongUpdate });
  }
});
