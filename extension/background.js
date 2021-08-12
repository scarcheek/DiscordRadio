let color = '#353a82'

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ color });
    console.debug(`Default background color set to %c${color}`, `color: ${color}`);
});

// Contextmenu shit

chrome.contextMenus.create({
    id: "some-command",
    title: "Display current Video in Discord RPC",
    contexts: ["page"],
    documentUrlPatterns: ['https://*.youtube.com/watch?*']
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId == "some-command") {
        console.log("yay!");
    }
});