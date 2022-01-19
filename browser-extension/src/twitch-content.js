const MESSAGES = {
  init: 'init',
  twitchStartTime: 'twitchStartTime',
};
let startTime = Date.now();

console.log('hi there')
browser.runtime.onMessage.addListener(req => {
  console.log('I am here now.')
  if (req.type === MESSAGES.init) {
    const res = {
      startTime: startTime,
      channelName: document.URL.split('/')[document.URL.split('/').length - 1],
      URL: document.URL,
      twitch: true,
    }

    console.dir(res);
    return Promise.resolve(res);
  }

});
