// Contextmenu shit
let selectedTabId = null;
chrome.contextMenus.create({
    id: "tracker",
    title: "Track current Video with Discord RPC",
    contexts: ["page"],
    documentUrlPatterns: ['https://*.youtube.com/watch?*']
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId == "tracker") {
        // Remove tracking from page
        if (selectedTabId && selectedTabId === tab.id) {
            chrome.tabs.sendMessage(selectedTabId, { type: "tabRemove" }, function (response) {
                console.log(`Stopped tracking tab with id: ${selectedTabId}`)

                chrome.contextMenus.update("tracker", {
                    title: "Track current Video with Discord RPC",
                    contexts: ["page"],
                    documentUrlPatterns: ['https://*.youtube.com/watch?*']
                })
                selectedTabId = null
            });
            return
        }

        //Change tracked page
        if (selectedTabId && selectedTabId !== tab.id) {
            chrome.tabs.sendMessage(selectedTabId, { type: "tabRemove" }, function (response) {
                console.log(`Stopped tracking tab with id: ${selectedTabId}`)
            });
        }

        chrome.tabs.sendMessage(tab.id, { type: "init" }, function (response) {
            if (!window.chrome.runtime.lastError) {
                console.log(`Now tracking: ${tab.title} with id ${tab.id}`, response)

                chrome.contextMenus.update("tracker", {
                    title: "Remove current Tab from Discord RPC",
                    contexts: ["page"],
                    documentUrlPatterns: ['*://*/*']
                })
                selectedTabId = tab.id
                updateDiscordRPC(response)
            } else {
                console.error('You need to refresh the page before trying to track it. If that doesn\'t fix it, contact Scar#9670 on Discord');
            }
        });
    }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo && changeInfo.status == "complete" && tabId === selectedTabId) {
        chrome.tabs.sendMessage(tabId, { data: tab, type: "tabChange" }, function (response) {
            if (!window.chrome.runtime.lastError) {
                console.log('Tracked tab change detected', response)
                updateDiscordRPC(response)
            }
        });
    }
});

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    if (removeInfo && tabId === selectedTabId) {
        fetch(`http://localhost:6969`, {
            method: "DELETE"
        }).then(() => {
            console.log(`Stopped tracking Tab with id: ${selectedTabId}`)
            selectedTabId = null
        }).catch(err => console.error('gotted error: ' + err));
    }
})

chrome.runtime.onMessage.addListener(function (request) {
    if (request.type === "pause" || request.type === "play" || request.type === "timeupdate") {
        updateDiscordRPC(request.data);
    }
}
)

function updateDiscordRPC(data) {
    fetch(`http://localhost:6969`, {
        method: "POST",
        body: JSON.stringify(data),
        mode: "no-cors"
    }).catch((err) => console.error(err.message));
}
