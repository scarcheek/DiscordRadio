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
window.addEventListener('load', () => chrome.runtime.sendMessage({ type: MESSAGES.pageLoaded }));

// communication with background.js
chrome.runtime.onMessage.addListener(
  async function (req, sender, reply) {
    switch (req.type) {
      case MESSAGES.init:
        addVideo(reply);
        break;

      case MESSAGES.remove:
        removeVideo(reply);
        break;

      case MESSAGES.refreshPage:
        if (location.search.includes('v=')) location.reload();
        else removeVideo(reply);
        break;
    }

    return true; // indicates an asynchronous response
  }
);


async function addVideo(reply) {
  video = document.querySelector('video');

  video.onpause =()=> {
    chrome.runtime.sendMessage({ data: formatData(), type: MESSAGES.pause });
  }

  video.onplay =()=> {
    chrome.runtime.sendMessage({ data: formatData(), type: MESSAGES.play });
  }

  video.onseeked =()=> {
    chrome.runtime.sendMessage({ data: formatData(), type: MESSAGES.seek });
  }

  reply(formatData());
  return
}

function removeVideo(reply) {
  if (video) {
    video.onpause = null;
    video.onplay = null;
    video.onseeked = null;
    video = null;
  }

  fetch(`http://localhost:6969`, { method: "DELETE" })
  .then(() => {
    if (reply) reply({ farewell: "removed video reference" });
  })
  .catch(err => console.error('gotted error: ' + err));
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
