let color = '#353a82'

chrome.runtime.onInstalled.addListener(()=> {
    chrome.storage.sync.set({color});
    console.debug(`Default background color set to %c${color}`, `color: ${color}`);
});