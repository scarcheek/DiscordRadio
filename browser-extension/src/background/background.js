const MESSAGES = {
  init: 'init',
  newVideo: 'newVideo',
  pause: 'pause',
  play: 'play',
  seek: 'seek',
  remove: 'remove',
  pageLoaded: 'pageLoaded',
  update: 'update',
  listenAlongUpdate: 'listenAlongUpdate',
  error: 'error',
};

const CONTEXT_MENU = {
  track: 'track',
  stop: 'stop',
};

const $ = {
  moodId: null,
  trackedTabId: null,
  trackedWindowId: null,
  listeningAlongTabId: null,
};

// Set the default mood and storage state on installation
browser.runtime.onStartup.addListener(initializeStorage);
browser.runtime.onInstalled.addListener(initializeStorage);
  
function initializeStorage() {
  browser.browserAction.setBadgeBackgroundColor({ color: '#e49076' });
  return browser.storage.sync.set({
    moodId: 'none',
    trackedTabId: null,
    trackedWindowId: null,
    listeningAlongTabId: null,
  });
}

// Load the state from the storage
let storageState = browser.storage.sync.get().then((storageState) => {
  console.log(`🚀 ~ storageState ~ storageState`, storageState);
  if (storageState) Object.assign($, storageState);
});

// Sync the state with the storage
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    console.log(`🚀 ~ browser.storage.onChanged.addListener ~ changes`, changes);
    Object.entries(changes).forEach(([key, { newValue }]) => $[key] = newValue);

    if (changes.moodId) {
      console.log(`Mood id changed. Old: ${changes.moodId.oldValue} New: ${changes.moodId.newValue}`)
      $.moodId = changes.moodId.newValue;
      Activity.updateMood($.moodId);
    }
  }
});


// Add the context menu entries
browser.contextMenus.removeAll().then(() => {
  browser.contextMenus.create({
    id: CONTEXT_MENU.track,
    title: "Track current Tab with Discord RPC",
    contexts: ["page"],
    documentUrlPatterns: ['https://*.youtube.com/*']
  });

  browser.contextMenus.create({
    id: CONTEXT_MENU.stop,
    title: "Remove tracked Tab from Discord RPC",
    contexts: ["page"],
    documentUrlPatterns: ['*://*/*'],
    enabled: false
  });
});

// Add the context menu listeners
browser.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId == CONTEXT_MENU.track) {
    if ($.trackedTabId && $.trackedTabId !== tab.id) {
      // A Tab was already tracked
      console.log(`Removing old tracked tab`);
      browser.tabs.sendMessage(tab.id, { type: MESSAGES.remove }).then(() => {
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
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log(`🚀 ~ browser.tabs.onUpdated.addListener ~ changeInfo`, changeInfo);

  if (tab.id === $.listeningAlongTabId && changeInfo.url) {
    removeListenAlong()
  }

  if (tab.url.includes('discordradio.tk/') && changeInfo.status === 'complete') {
    browser.storage.sync.set({ listeningAlongTabId: tabId });
  }
  else if (tab.id === $.trackedTabId && !tab.url.includes('youtube.com') && changeInfo.status === 'complete') {
    Activity.remove();
  }
});

// Add the tab closed listener
browser.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  if ($.listeningAlongTabId === tabId) {
    removeListenAlong();
  } 
  else if (removeInfo && tabId === $.trackedTabId) {
    removeTrack();
  }
});


// Add the tab/window focus changed listeners to update the context menu accordingly
browser.tabs.onActivated.addListener((activeInfo) => {
  console.log(`🚀 ~ browser.tabs.onActivated.addListener ~ tabInfo`, { tabId: activeInfo?.tabId, trackedTabId: $.trackedTabId });
  if (activeInfo) onFocusedChanged(activeInfo.tabId, $.trackedTabId);
});

browser.windows.onFocusChanged.addListener((windowId) => {
  console.log(`🚀 ~ browser.windows.onFocusChanged.addListener ~ windowInfo`, { windowId, trackedWindowId: $.trackedWindowId });
  onFocusedChanged(windowId, $.trackedWindowId)
});

browser.tabs.onAttached.addListener((tabId, attachInfo) => {
  if (tabId === $.trackedTabId && attachInfo && attachInfo.newWindowId !== $.trackedWindowId) {
    browser.storage.sync.set({ trackedWindowId: attachInfo.newWindowId });
  }
});


// communication with content.js
browser.runtime.onMessage.addListener(async (request, sender) => {
  if ([MESSAGES.play, MESSAGES.pause, MESSAGES.seek, MESSAGES.newVideo].includes(request.type)) {
    if (request.data) Activity.set(request.data);
  }
  else if (request.type === MESSAGES.listenAlongUpdate) {
    if (request.data) Activity.listenAlong(request.data);
  }
  else if (request.type === MESSAGES.remove) {
    Activity.remove();
  }
  else if (request.type === MESSAGES.pageLoaded) {
    if ($.trackedTabId && $.trackedTabId === sender?.tab?.id) {
      initializeTrack(await browser.tabs.get($.trackedTabId));
    }
  }
});

function initializeTrack(tab) {
  console.log(`Trying to track tab with id: ${tab.id}`);

  browser.tabs.sendMessage(tab.id, { type: MESSAGES.init })
    .then((res) => {
      if (!discord.conn) {
        return browser.tabs.sendMessage(tab.id, { 
          data: 'Could not connect to Discord, make sure you have Discord as well as the Discord RPC Gateway application up and running.', 
          type: MESSAGES.error 
        });
      }
      
      if ($.trackedTabId) {
        // if already tracking a tab, clear the badge for the old tab
        browser.browserAction.setBadgeText({ tabId: $.trackedTabId, text: '' });
      }
      
      console.log(`Now tracking: ${tab.title} with id ${tab.id}`, res)
      toggleContextMenuOptions(CONTEXT_MENU.stop, CONTEXT_MENU.track);
      browser.browserAction.setBadgeText({ tabId: tab.id, text: '👀' + (server.conn ? '' : ' 🔇') });
      browser.storage.sync.set({ trackedTabId: tab.id, trackedWindowId: tab.windowId });
      
      if (res) Activity.set(res);
    })
    .catch(() => {
      browser.browserAction.setBadgeText({ tabId: tab.id, text: '🔁' });
    });
}

function removeTrack(tab) {
  if (tab) {
    browser.tabs.sendMessage(tab.id, { type: MESSAGES.remove }).then(finishRemoveTrack);
  }
  else {
    finishRemoveTrack();
  }

  async function finishRemoveTrack() {
    if (discord.conn) await Activity.remove();
    console.log(`Stopped tracking tab with id: ${$.trackedTabId}`);
    toggleContextMenuOptions(CONTEXT_MENU.track, CONTEXT_MENU.stop);
    if (tab && $.trackedTabId) browser.browserAction.setBadgeText({ tabId: $.trackedTabId, text: '' });
    browser.storage.sync.set({ trackedTabId: null, trackedWindowId: null });
  }
}

function removeListenAlong() {
  browser.storage.sync.set({ listeningAlongTabId: null })
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
  browser.contextMenus.update(contextMenuId, { enabled: true });
}

/**
 * Removes a contextmenu option
 * Shortcut for the complicated and un-handy chrome api
 * @param {number} contextMenuId 
 */
function disableContextMenuOption(contextMenuId) {
  browser.contextMenus.update(contextMenuId, { enabled: false });
}
