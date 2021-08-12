//// content.js ////
console.log("something happens")
// 1. Send the background a message requesting the user's data
chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    console.log(sender.tab ?
      "from a content script:" + sender.tab.url :
      "from the extension");
    if (request.greeting === "hello") {

      let a = document.querySelector('video');

      let title = document.getElementsByClassName("title style-scope ytd-video-primary-info-renderer")[0].textContent
      let channelName = document.querySelector("ytd-channel-name").firstElementChild.children[1].innerText.trim();
      
      let currentTimeText = Math.floor(a.currentTime / 60) + ':' + Math.floor(a.currentTime % 60)
      let durationText = Math.floor(a.duration / 60) + ':' + Math.floor(a.duration % 60)

      sendResponse({ URL: document.URL, title: title, channelName: channelName, currentTimeText: currentTimeText, durationText: durationText, duration: a.duration, currentTime: a.currentTime, paused: a.paused, });
    }
  }
);