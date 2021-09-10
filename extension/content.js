//// content.js ////
let video;
// 1. Send the background a message requesting the user's data
chrome.runtime.onMessage.addListener(
  async function (request, sender, sendResponse) {
    if (request.type === "init") {
      addVideo(sendResponse);
    } 
    else if (request.type === "tabChange") {
      if (!window.location.search.includes('v=')) {
        removeVideo(sendResponse);
      }
      else if (!request.url.includes('#discordradio')) {
        window.location.replace(`${request.url}#discordradio`); // trigger reload
      }
    } 
    else if (request.type === "tabRemove") {
      removeVideo(sendResponse);
    }
    return true;
  }
);

window.addEventListener('load', e => chrome.runtime.sendMessage({ type: "pageLoaded" }));

async function addVideo(sendResponse) {
  video = document.querySelector('video');

  video.onpause = (event) => {
    chrome.runtime.sendMessage({ data: formatData(document, event.target), type: "pause" });
  }

  video.onplay = (event) => {
    chrome.runtime.sendMessage({ data: formatData(document, event.target), type: "play" });
  }

  video.onseeked = async (event) => {
    chrome.runtime.sendMessage({ data: formatData(document, event.target), type: "seeked" });
  }

  sendResponse(formatData(document));
  return
}

function removeVideo(sendResponse) {
  if (video) {
    video.seeked = null;
    video.onpause = null;
    video.onplay = null;
    video = null;
  }
  fetch(`http://localhost:6969`, {
    method: "DELETE"
  }).then(() => {
    if (sendResponse) sendResponse({ farewell: "removed video reference" })
  }).catch(err => console.error('gotted error: ' + err));
}

function formatData(document, newVideo) {
  const currVideo = newVideo ?? video;
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
    URL: `${location.href}`.replaceAll(/&t=\d+s(?=&|$)/g, ''),
    title: playerInfo?.name,
    channelName: playerInfo?.author,
    currTime: Math.floor(currVideo.currentTime),
    paused: currVideo.paused,
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
