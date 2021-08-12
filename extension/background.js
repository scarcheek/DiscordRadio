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

        chrome.tabs.sendMessage(tab.id, {type: "init"}, function(response) {
            updateDiscordRPC(response)
          });

    }
});

chrome.runtime.onMessage.addListener(
    function(request) {
        if (request.type === "timeUpdate")
          updateDiscordRPC(request.data);
      }
)

function updateDiscordRPC(data) {
    console.dir(data);
    //TODO: moch
}