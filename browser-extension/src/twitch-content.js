const MESSAGES = {
  init: 'init',
  twitchStartTime: 'twitchStartTime',
  update: 'update',
  newStream: 'newStream',
};
let startTime = Date.now();

// let background.js know the page is loaded
window.addEventListener('load', () => browser.runtime.sendMessage({ type: MESSAGES.pageLoaded }));


browser.runtime.onMessage.addListener(req => {
  console.log('I am here now.')
  switch (req.type) {
    case MESSAGES.init: return init();
    case MESSAGES.update: return update();
    default:
      break;
  }
  if (req.type === MESSAGES.init) return init()
  
});

function init() {
  const res = {
    startTime: startTime,
    channelName: document.URL.split('/')[document.URL.split('/').length - 1],
    URL: document.URL,
    twitch: true,
  }

  console.dir(res);
  return Promise.resolve(res);
}

function update() {
  startTime = Date.now();
  const data = {
    startTime: startTime,
    channelName: document.URL.split('/')[document.URL.split('/').length - 1],
    URL: document.URL,
    twitch: true,
  }

  browser.runtime.sendMessage({ data, type: MESSAGES.newStream });
}

