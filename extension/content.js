//// content.js ////
console.log("something happens")
let video
let counter = 0;
// 1. Send the background a message requesting the user's data
chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.type === "init") {

      video = document.querySelector('video');

      video.onpause = (event) => {
        chrome.runtime.sendMessage({ data: formatData(document, event.target), type: "pause" });
      }

      video.onplay = (event) => {
        chrome.runtime.sendMessage({ data: formatData(document, event.target), type: "play" });
      }

      video.ontimeupdate = (event) => {
        if (counter === 5){
          counter = 0;
          chrome.runtime.sendMessage({ data: formatData(document, event.target), type: "timeupdate" });
        } else counter++;
      }


      sendResponse(formatData(document));
    }
  }
);

function formatData(document, newVideo) {
  let currVideo = newVideo ? newVideo : video;

  let title = document.getElementsByClassName("title style-scope ytd-video-primary-info-renderer")[0].textContent
  let channelName = document.querySelector("ytd-channel-name").firstElementChild.children[1].innerText.trim();

  return {
    URL: document.URL,
    title: title,
    channelName: channelName,
    currTime: Math.floor(currVideo.currentTime),
    paused: currVideo.paused,
  }
}