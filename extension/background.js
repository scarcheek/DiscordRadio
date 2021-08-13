// Contextmenu shit
let selectedTabId = null;
chrome.contextMenus.create({
    id: "some-command",
    title: "Display current Video in Discord RPC",
    contexts: ["page"],
    documentUrlPatterns: ['https://*.youtube.com/watch?*']
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId == "some-command") {
        selectedTabId = tab.id
        chrome.tabs.sendMessage(tab.id, { type: "init" }, function (response) {
            console.log(`Now tracking: ${tab.title}`)
            updateDiscordRPC(response)
        });
    }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo && changeInfo.status == "complete" && tabId === selectedTabId) {
        chrome.tabs.sendMessage(tabId, { data: tab, type: "tabChange" }, function (response) {
            updateDiscordRPC(response)
        });

    }
});

chrome.runtime.onMessage.addListener(
    function (request) {
        if (request.type === "pause" || request.type === "play" || request.type === "timeupdate")
            updateDiscordRPC(request.data);
    }
)

function updateDiscordRPC(data) {
    fetch(`http://localhost:6969`, {
        method: "POST",
        body: JSON.stringify(data),
        mode: "no-cors"
    });
}
