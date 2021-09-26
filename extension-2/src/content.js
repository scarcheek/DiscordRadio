const MESSAGES = {
  init: 'init',
  newVideo: 'newVideo',
  pause: 'pause',
  play: 'play',
  seek: 'seek',
  remove: 'remove',
  pageLoaded: 'pageLoaded',
};

let video;
let observer;


// let background.js know the page is loaded
window.addEventListener('load', () => browser.runtime.sendMessage({ type: MESSAGES.pageLoaded }));

// communication with background.js
function handleMessage(req) {
  switch (req.type) {
    case MESSAGES.init:
      return addVideo();
      
    case MESSAGES.remove:
      return removeVideo();
  }

  return true; // indicates an asynchronous response
}
browser.runtime.onMessage.addListener(handleMessage);


async function addVideo() {
  video = document.querySelector('video');
  addObserver();

  video.onpause = () => {
    browser.runtime.sendMessage({ data: formatData(), type: MESSAGES.pause });
  };

  video.onplay = () => {
    browser.runtime.sendMessage({ data: formatData(), type: MESSAGES.play });
  };

  video.onseeked = () => {
    browser.runtime.sendMessage({ data: formatData(), type: MESSAGES.seek });
  };

  return formatData();
}

function addObserver() {
  const titleTag = document.querySelector('.title > yt-formatted-string.ytd-video-primary-info-renderer');
  if (!titleTag) return setTimeout(addObserver, 1000);
    
  console.dir(titleTag);
  observer = new MutationObserver(() => {
    browser.runtime.sendMessage({ data: formatData(), type: MESSAGES.newVideo });
  });
  
  observer.observe(titleTag, { childList: true });
}

async function removeVideo() {
  if (video) {
    video.onpause = null;
    video.onplay = null;
    video.onseeked = null;
    video = null;
  }
}

function formatData() {
  const playerInfo = {};

  if (document.querySelector('.title > yt-formatted-string.ytd-video-primary-info-renderer')) {
    playerInfo.title = document.querySelector('.title > yt-formatted-string.ytd-video-primary-info-renderer').innerText;
    playerInfo.channelName = document.querySelector('.ytd-channel-name > yt-formatted-string.ytd-channel-name').innerText;
  }
  else if (document.querySelector('#scriptTag')) {
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
