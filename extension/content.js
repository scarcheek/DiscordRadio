//// content.js ////
console.log("something happens")
let video, tab
let counter = 5;
// 1. Send the background a message requesting the user's data
chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.type === "init" || request.type === "tabChange") {
      video = document.querySelector('video');
      if (!window.location.search.includes('v=')) {
        video.ontimeupdate = null;
        video.onpause = null;
        video.onplay = null;
        fetch(`http://localhost:6969`, {
          method: "DELETE"
        });
      }
      else {
        video.onpause = (event) => {
          chrome.runtime.sendMessage({ data: formatData(document, event.target), type: "pause" });
        }

        video.onplay = (event) => {
          chrome.runtime.sendMessage({ data: formatData(document, event.target), type: "play" });
        }

        video.ontimeupdate = (event) => {
          if (counter === 5) {
            counter = 0;
            chrome.runtime.sendMessage({ data: formatData(document, event.target), type: "timeupdate" });
          } else counter++;
        }

        sendResponse(formatData(document));
        //TODO: add a route where you can make the discord rpc go away and execute it in an if (request.type === "tabchange")
      }
    }
  }
);

function formatData(document, newVideo) {
  let currVideo = newVideo ? newVideo : video;

  let title = document.getElementsByClassName("title style-scope ytd-video-primary-info-renderer")[0].textContent
  let channelName = document.querySelector('.ytd-video-owner-renderer ytd-channel-name yt-formatted-string').innerText.trim();

  return {
    URL: document.URL,
    title: title,
    channelName: channelName,
    currTime: Math.floor(currVideo.currentTime),
    paused: currVideo.paused,
  }
}