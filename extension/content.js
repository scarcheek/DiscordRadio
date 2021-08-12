//// content.js ////
console.log("something happens")
let video
// 1. Send the background a message requesting the user's data
chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.type === "init") {

      video = document.querySelector('video');

      video.ontimeupdate = (event) => {
        chrome.runtime.sendMessage({ data: formatData(document, event.target), type: "timeUpdate" });
      }

      sendResponse(formatData(document));
    }
  }
);

function formatData(document, newVideo) {
  let currVideo = newVideo ? newVideo : video;

  let title = document.getElementsByClassName("title style-scope ytd-video-primary-info-renderer")[0].textContent
  let channelName = document.querySelector("ytd-channel-name").firstElementChild.children[1].innerText.trim();

  let currentTimeText = Math.floor(currVideo.currentTime / 60) + ':' + Math.floor(currVideo.currentTime % 60)
  let durationText = Math.floor(currVideo.duration / 60) + ':' + Math.floor(currVideo.duration % 60)

  return { URL: document.URL, 
    title: title, 
    channelName: channelName, 
    currentTimeText: currentTimeText, 
    durationText: durationText, 
    duration: currVideo.duration, 
    currentTime: currVideo.currentTime, 
    paused: currVideo.paused, }
}