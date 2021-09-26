const MESSAGES = {
  init: 'init',
  pause: 'pause',
  play: 'play',
  seek: 'seek',
  remove: 'remove',
  refreshPage: 'refreshPage',
  pageLoaded: 'pageLoaded',
};

let video;


// let background.js know the page is loaded
window.addEventListener('load', () => browser.runtime.sendMessage({ type: MESSAGES.pageLoaded }));
// communication with background.js
function handleMessage(req) {
  switch (req.type) {
    case MESSAGES.init:
      return addVideo();
      
    case MESSAGES.remove:
      return removeVideo();

    case MESSAGES.refreshPage:
      if (location.search.includes('v=')) location.reload();
      else removeVideo();
      break;
  }

  return true; // indicates an asynchronous response
}
browser.runtime.onMessage.addListener(handleMessage);


async function addVideo() {
  video = document.querySelector('video');

  video.onpause =()=> {
    browser.runtime.sendMessage({ data: formatData(), type: MESSAGES.pause });
  }

  video.onplay =()=> {
    browser.runtime.sendMessage({ data: formatData(), type: MESSAGES.play });
  }

  video.onseeked =()=> {
    browser.runtime.sendMessage({ data: formatData(), type: MESSAGES.seek });
  }

  return formatData()
}

function removeVideo() {
  if (video) {
    video.onpause = null;
    video.onplay = null;
    video.onseeked = null;
    video = null;
  }
  return Promise.resolve();
}

function formatData() {
  const playerInfo = {};

  if (document.querySelector('#scriptTag')) {
    const info = JSON.parse(document.querySelector('#scriptTag')?.textContent);
    playerInfo.title = info.name;
    playerInfo.channelName = info.author;
  }
  else if (document.querySelector('meta[itemprop="name"]')) {
    playerInfo.title = document.querySelector('meta[itemprop="name"]').content;
    playerInfo.channelName = document.querySelector('span[itemprop="author"] link[itemprop="name"]').attributes.content.value;
  }

  return {
    ...playerInfo,
    URL: `${location.href}`.replaceAll(/&t=\d+s(?=&|$)/g, ''),
    currTime: Math.floor(video.currentTime),
    paused: video.paused,
  }
}
