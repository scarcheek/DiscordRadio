let lastRequestData = null;
let selectedTabId = null, selectedWindowId = null, currentMoodId = null;
let contextMenuIds = {
  track: 'track',
  stop: 'stop'
}

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.set({ moodId: 'none' })
});
chrome.storage.sync.get('moodId', (data) => {
  if (data.moodId)
    currentMoodId = data.moodId
})

// Contextmenu shit
chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: "stop",
    title: "Remove tracked Tab from Discord RPC",
    contexts: ["page"],
    documentUrlPatterns: ['*://*/*'],
    enabled: false
  })

  chrome.contextMenus.create({
    id: "track",
    title: "Track current Tab with Discord RPC",
    contexts: ["page"],
    documentUrlPatterns: ['https://*.youtube.com/watch?*']
  });
})


chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId == "track") {
    // A Tab was already tracked
    if (selectedTabId && selectedTabId !== tab.id) {
      console.log(`Removing old tracked tab`)
      chrome.tabs.sendMessage(selectedTabId, { type: "tabRemove" }, function (response) {
        console.log(`Stopped tracking tab with id: ${selectedTabId}`)
        initializeTrack(tab)
      });
    }
    //First track of the session
    else {
      initializeTrack(tab);
    }
  }
  // The contextMenu option to 'stop tracking' has been selected
  if (info.menuItemId === 'stop') {
    chrome.tabs.sendMessage(selectedTabId, { type: "tabRemove" }, function (response) {
      console.log(`Stopped tracking tab with id: ${selectedTabId}`)

      removeAndAddContext(contextMenuIds.track, contextMenuIds.stop);

      chrome.browserAction.setBadgeText({ tabId: selectedTabId, text: '' });
      selectedTabId = null;
      selectedWindowId = null;
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

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  if (tabId === selectedTabId && attachInfo && attachInfo.newWindowId !== selectedWindowId) {
    selectedWindowId = attachInfo.newWindowId
  }
})

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  if (removeInfo && tabId === selectedTabId) {
    fetch(`http://localhost:6969`, {
      method: "DELETE"
    }).then(() => {
      console.log(`Stopped tracking tab with id: ${selectedTabId}`)
      selectedTabId = null;
      selectedWindowId = null;

      removeAndAddContext(contextMenuIds.track, contextMenuIds.stop);
      chrome.browserAction.setBadgeText({ tabId, text: '' });
    }).catch(err => console.error('gotted error: ' + err));
  }
});

chrome.tabs.onActiveChanged.addListener((tabId, selectInfo) => {
  console.log("EVENT: OnActiveChanged: ", tabId, selectedTabId)
  if (selectInfo) { onFocusedChanged(tabId, selectedTabId); }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  console.log("EVENT: onFocusChanged: ", windowId, selectedWindowId)
  onFocusedChanged(windowId, selectedWindowId)
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    if (changes.moodId) {
      console.log(`Mood id changed. Old: ${changes.moodId.oldValue} New: ${changes.moodId.newValue}`)
      currentMoodId = changes.moodId.newValue;
      updateDiscordRPC(lastRequestData);
    }
  }
})

chrome.runtime.onMessage.addListener(function (request) {
  if (request.type === "pause" || request.type === "play" || request.type === "seeked") {
    updateDiscordRPC(request.data);
  }
});
function updateDiscordRPC(data) {
  if (!data) return;
  lastRequestData = data;
  data.mood = currentMoodId;

  fetch(`http://localhost:6969`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
  }).catch((err) => console.error(err.message));
}

function initializeTrack(tab) {
  console.log(`trying to track tab with id: ${tab.id}`)
  chrome.tabs.sendMessage(tab.id, { type: 'init' }, function (response) {
    if (!window.chrome.runtime.lastError) {
      console.log(`Now tracking: ${tab.title} with id ${tab.id}`, response)

      removeAndAddContext(contextMenuIds.stop, contextMenuIds.track);
      selectedTabId = tab.id;
      selectedWindowId = tab.windowId;
      chrome.browserAction.setBadgeText({ tabId: tab.id, text: 'ON' });
      updateDiscordRPC(response);
    } else {
      console.error('You need to refresh the page or restart your browser before using the context menu. If that doesn\'t fix it, contact Scar#9670 on Discord', window.chrome.runtime.lastError.message);
    }
  });
}

/**
 * When the focus changes you either want to add back the 'tracking' option or remove it + add the 'stop' option
 * @param {number} newId The new Id (window.id, tab.id, ...) you got from the fired event
 * @param {number} selectedId The currently selected Id
 */
function onFocusedChanged(newId, selectedId) {
  if (newId && newId !== selectedId) {
    addContextMenu(contextMenuIds.track)
  }
  else {
    removeAndAddContext(contextMenuIds.stop, contextMenuIds.track);
  }

}

/**
 * Conveniently removes one contextmenu option and adds another one
 * @param {number} addId The Id of the contextmenu option you want to add
 * @param {number} removeId The Id of the contextmenu option you want to remove
 */
function removeAndAddContext(addId, removeId) {
  if (addId !== removeId) {
    addContextMenu(addId);
    removeContextMenu(removeId);
  }
}

/**
 * Adds a contextmenu option
 * Shortcut for the complicated and un-handy chrome api
 * @param {number} contextMenuId 
 */
function addContextMenu(contextMenuId) {
  chrome.contextMenus.update(contextMenuId, { enabled: true })
}

/**
 * Removes a contextmenu option
 * Shortcut for the complicated and un-handy chrome api
 * @param {number} contextMenuId 
 */
function removeContextMenu(contextMenuId) {
  chrome.contextMenus.update(contextMenuId, { enabled: false })
}
