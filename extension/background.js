// Contextmenu shit

chrome.contextMenus.create({
    id: "some-command",
    title: "Display current Video in Discord RPC",
    contexts: ["page"],
    documentUrlPatterns: ['https://*.youtube.com/watch?*']
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId == "some-command") {
        console.log(tab);
        chrome.tabs.sendMessage(tab.id, { type: "init" }, function (response) {
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
    console.dir(data);

    fetch(`http://localhost:6969`, {
        method: "POST",
        body: JSON.stringify(data),
        mode: "no-cors"
    }).then((res) =>
        console.log("hello")
    )
}