//// content.js ////
let video;
// 1. Send the background a message requesting the user's data
chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.type === "init") {
      addVideo(sendResponse);
    } else if (request.type === "tabChange") {
      if (!window.location.search.includes('v='))
        removeVideo(sendResponse);
      else
        addVideo(sendResponse);
    } else if (request.type === "tabRemove") {
      removeVideo(sendResponse);
    }
    return true;
  }
);

function addVideo(sendResponse) {
  video = document.querySelector('video');

  video.onpause = (event) => {
    chrome.runtime.sendMessage({ data: formatData(document, event.target), type: "pause" });
  }

  video.onplay = (event) => {
    chrome.runtime.sendMessage({ data: formatData(document, event.target), type: "play" });
  }

  video.onseeked = (event) => {
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
  let currVideo = newVideo ? newVideo : video;

  let title = document.getElementsByClassName("title style-scope ytd-video-primary-info-renderer")[0].textContent
  let channelName = document.querySelector('.ytd-video-owner-renderer ytd-channel-name yt-formatted-string').innerText.trim();

  return {
    URL: document.URL.replaceAll(/&t=\d+s(?=&|$)/g, ''),
    title: title,
    channelName: channelName,
    currTime: Math.floor(currVideo.currentTime),
    paused: currVideo.paused,
  }
}
