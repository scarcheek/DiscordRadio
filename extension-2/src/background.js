const MESSAGES = {
  init: 'init',
  pause: 'pause',
  play: 'play',
  seek: 'seek',
  remove: 'remove',
  refreshPage: 'refreshPage',
  pageLoaded: 'pageLoaded',
};

const CONTEXT_MENU = {
  track: 'track',
  stop: 'stop',
};

const $ = {
  moodId: null,
  trackedTabId: null,
  trackedWindowId: null,
  lastData: null,
  listeningAlongTabId: null,
};

// Set the default mood and storage state on installation
chrome.runtime.onInstalled.addListener(() => chrome.storage.sync.set({
  moodId: 'none',
  trackedTabId: null,
  trackedWindowId: null,
  lastData: null,
  listeningAlongTabId: null,
}));

// Load the state from the storage
chrome.storage.sync.get(null, (storageState) => {
  outputDebugMessage(35, 'chrome.storage.sync.get', null, storageState)
  if (storageState) Object.assign($, storageState);
});

// Sync the state with the storage
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    outputDebugMessage(42, 'chrome.storage.onChanged', null, changes)
    Object.entries(changes).forEach(([key, { newValue }]) => $[key] = newValue);

    if (changes.moodId) {
      console.log(`Mood id changed. Old: ${changes.moodId.oldValue} New: ${changes.moodId.newValue}`)
      $.moodId = changes.moodId.newValue;
      updateDiscordRPC($.lastData);
    }
  }
});


// Add the context menu entries
chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU.track,
    title: "Track current Tab with Discord RPC",
    contexts: ["page"],
    documentUrlPatterns: ['https://*.youtube.com/watch?*']
  });

  chrome.contextMenus.create({
    id: CONTEXT_MENU.stop,
    title: "Remove tracked Tab from Discord RPC",
    contexts: ["page"],
    documentUrlPatterns: ['*://*/*'],
    enabled: false
  });
});

// Add the context menu listeners
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId == CONTEXT_MENU.track) {
    if ($.trackedTabId && $.trackedTabId !== tab.id) {
      // A Tab was already tracked
      console.log(`Removing old tracked tab`);
      chrome.tabs.sendMessage($.trackedTabId, { type: MESSAGES.remove }, () => {
        console.log(`Stopped tracking tab with id: ${$.trackedTabId}`);
        initializeTrack(tab);
      });
    }
    else {
      // First track of the session
      initializeTrack(tab);
    }
  }
  else if (info.menuItemId === CONTEXT_MENU.stop) {
    removeTrack(tab);
  }
});


// Add the listener for url changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log(changeInfo)
  if (tab.id === $.listeningAlongTabId && changeInfo.url) {
    removeListenAlong()
  } if (changeInfo.url && tabId === $.trackedTabId) {
    chrome.tabs.sendMessage(tabId, { url: changeInfo.url, type: MESSAGES.refreshPage });
  } if (tab.url.includes('discordradio.tk/') && changeInfo.status === 'complete') {
    updateDiscordRPC({ ...$.lastData, host: getHostFromUrl(tab.url) })
    chrome.storage.sync.set({ listeningAlongTabId: tabId });
  }
});

// Add the tab closed listener
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  if ($.listeningAlongTabId === tabId) {
    removeListenAlong();
  } else
    if (removeInfo && tabId === $.trackedTabId) {
      removeTrack();
    }
});


// Add the tab/window focus changed listeners to update the context menu accordingly
chrome.tabs.onActivated.addListener((activeInfo) => {
  outputDebugMessage(114, 'chrome.tabs.onActivated', { tabId: activeInfo?.tabId, trackedTabId: $.trackedTabId })
  if (activeInfo) onFocusedChanged(activeInfo.tabId, $.trackedTabId);
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  outputDebugMessage(119, 'chrome.tabs.onFocusChanged', { windowId, trackedWindowId: $.trackedWindowId })
  onFocusedChanged(windowId, $.trackedWindowId)
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  if (tabId === $.trackedTabId && attachInfo && attachInfo.newWindowId !== $.trackedWindowId) {
    chrome.storage.sync.set({ trackedWindowId: attachInfo.newWindowId });
  }
});


// communication with content.js
chrome.runtime.onMessage.addListener(async (request) => {
  if ([MESSAGES.play, MESSAGES.pause, MESSAGES.seek].includes(request.type)) {
    updateDiscordRPC(request.data);
  }
  else if (request.type === MESSAGES.pageLoaded) {
    if ($.trackedTabId) initializeTrack(await chrome.tabs.get($.trackedTabId));
  }
});


async function updateDiscordRPC(data) {
  if (!data) return;
  data.mood = $.moodId;
  data.updatedOn = Date.now();
  
  console.log('sending data:', data);
  await Activity.set(data);
  chrome.storage.sync.set({ lastData: data });
}

function initializeTrack(tab) {
  console.log(`trying to track tab with id: ${tab.id}`);

  chrome.tabs.sendMessage(tab.id, { type: MESSAGES.init }, (res) => {
    if (!chrome.runtime.lastError) {
      console.log(`Now tracking: ${tab.title} with id ${tab.id}`, res)

      if ($.trackedTabId) {
        // if already tracking a tab
        chrome.browserAction.setBadgeText({ tabId: $.trackedTabId, text: '' });
      }

      toggleContextMenuOptions(CONTEXT_MENU.stop, CONTEXT_MENU.track);
      chrome.browserAction.setBadgeText({ tabId: tab.id, text: '✔' });
      chrome.storage.sync.set({ trackedTabId: tab.id, trackedWindowId: tab.windowId });
      updateDiscordRPC(res);
    }
    else {
      chrome.browserAction.setBadgeText({ tabId: tab.id, text: 'ERR' });
      console.error('You need to refresh the page or restart your browser before using the context menu. If that doesn\'t fix it, contact Scar#5966 on Discord', chrome.runtime.lastError.message);
    }
  });
}

function removeTrack(tab) {
  if (tab) {
    chrome.tabs.sendMessage($.trackedTabId, { type: MESSAGES.remove }, finishRemoveTrack);
  }
  else {
    finishRemoveTrack();
  }

  async function finishRemoveTrack() {
    await Activity.remove();
    console.log(`Stopped tracking tab with id: ${$.trackedTabId}`);
    toggleContextMenuOptions(CONTEXT_MENU.track, CONTEXT_MENU.stop);
    chrome.browserAction.setBadgeText({ tabId: $.trackedTabId, text: '' });
    chrome.storage.sync.set({ trackedTabId: null, trackedWindowId: null });
  }
}

function removeListenAlong() {
  chrome.storage.sync.set({ listeningAlongTabId: null })
  Activity.stopListening();
}

/**
 * When the focus changes you either want to add back the 'tracking' option or remove it + add the 'stop' option
 * @param {number} newId The new Id (window.id, tab.id, ...) you got from the fired event
 * @param {number} trackedId The currently tracked Id
 */
function onFocusedChanged(newId, trackedId) {
  if (newId !== trackedId) {
    enableContextMenuOption(CONTEXT_MENU.track);
  }
  else {
    toggleContextMenuOptions(CONTEXT_MENU.stop, CONTEXT_MENU.track);
  }
}

/**
 * Conveniently removes one contextmenu option and adds another one
 * @param {number} enableId The Id of the contextmenu option you want to add
 * @param {number} disableId The Id of the contextmenu option you want to remove
 */
function toggleContextMenuOptions(enableId, disableId) {
  if (enableId !== disableId) {
    enableContextMenuOption(enableId);
    disableContextMenuOption(disableId);
  }
}

/**
 * Adds a contextmenu option
 * Shortcut for the complicated and un-handy chrome api
 * @param {number} contextMenuId 
 */
function enableContextMenuOption(contextMenuId) {
  chrome.contextMenus.update(contextMenuId, { enabled: true });
}

/**
 * Removes a contextmenu option
 * Shortcut for the complicated and un-handy chrome api
 * @param {number} contextMenuId 
 */
function disableContextMenuOption(contextMenuId) {
  chrome.contextMenus.update(contextMenuId, { enabled: false });
}

/**
 * 
 * @param {number} line 
 * @param {name} caller 
 * @param {Object} props 
 */
function outputDebugMessage(line, caller, props, ...objects) {
  let propsString = '';
  if (props) {
    for (let i = 0; i < Object.keys(props).length; i++) {
      propsString += `${Object.keys(props)[i]} ${Object.values(props)[i]}${Object.keys(props)[i + 1] ? ' > ' : ''}`;
    }
  }
  const outPutString = `🚀 ~ file: background.js ~ line ${line} ~ ${caller}${propsString.length > 0 ? ` ~ ${propsString}` : ''}`

  console.log(outPutString);
  if (objects.length > 0) {
    if (objects.length === 1)
      console.dir(objects[0]);
    else
      console.dir(objects)
  }
}
function getHostFromUrl(url) {
  return url.split('/')[url.split('/').length - 1];
}
