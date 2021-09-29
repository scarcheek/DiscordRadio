let discord = { conn: null };
let server = { conn: null };

browser.runtime.onStartup.addListener(connectToDiscord);
browser.runtime.onInstalled.addListener(connectToDiscord);

async function connectToDiscord() {
  try {
    console.warn('Trying to connect to Discord...');
    // connect to discord
    discord = new DiscordRPC('875518867680657458');
    await discord.connect();
    browser.storage.sync.set({ link: `http://discordradio.tk/d/${discord.user.tag.replace('#', '/')}` });

    // auth to discord
    const authInfo = await browser.storage.sync.get(['refresh_token']);
    const { refresh_token } = await discord.login(authInfo.refresh_token);
    browser.storage.sync.set({ refresh_token });

    discord.on('message', console.dir);
    discord.on('close', () => {
      discord.conn = null;
      console.warn('Lost connection to discord, trying to reconnect in 5s...');
      browser.browserAction.setBadgeText({ text: '🚫' });
      if ($.trackedTabId) browser.browserAction.setBadgeText({ tabId: $.trackedTabId, text: '👀 🚫' });
      server.close();
      setTimeout(connectToDiscord, 5 * 1000);
    });

    console.log('Connected to Discord!');
    connectToServer();
  }
  catch (err) {
    discord.conn = null;
    console.warn('Could not connect to discord, retrying in 5s...');
    browser.browserAction.setBadgeText({ text: '🚫' });
    if ($.trackedTabId) browser.browserAction.setBadgeText({ tabId: $.trackedTabId, text: '👀 🚫' });
    setTimeout(connectToDiscord, 5 * 1000);
  }
}

async function connectToServer() {
  try {
    // connect to the discord radio server
    server = new DiscordRadioServer();
    await server.connect(discord.user);
    server.on('close', () => {
      server.conn = null;

      if (discord.conn) {
        console.warn('Lost connection to the Discord Radio Server, trying to reconnect in 5s...');
        browser.browserAction.setBadgeText({ text: '🔇' });
        if ($.trackedTabId) browser.browserAction.setBadgeText({ tabId: $.trackedTabId, text: '👀 🔇' });
        setTimeout(connectToServer, 5 * 1000);
      }
    });

    server.on('message', nrOfListeners => {
      if (nrOfListeners > 0 && $.trackedTabId) {
        browser.browserAction.setTitle({ title: `🥳 ${nrOfListeners} - Discord Radio` });
        browser.browserAction.setBadgeText({ text: `🥳 ${nrOfListeners}` });
        browser.browserAction.setBadgeText({ tabId: $.trackedTabId, text: `👀 ${nrOfListeners}` });
      }
      else {
        browser.browserAction.setTitle({ title: 'Discord Radio' });
        browser.browserAction.setBadgeText({ text: '' });
        if ($.trackedTabId) browser.browserAction.setBadgeText({ tabId: $.trackedTabId, text: '👀' });
      }

      Activity.updateListeners(nrOfListeners);
    });

    console.log('Connected to the Discord Radio Server!');
    if ($.trackedTabId) browser.tabs.sendMessage($.trackedTabId, { type: MESSAGES.update });
  }
  catch (err) {
    server.conn = null;

    if (discord.conn) {
      console.warn('Could not connect to the Discord Radio Server, retrying in 5s...');
      browser.browserAction.setBadgeText({ text: '🔇' });
      if ($.trackedTabId) browser.browserAction.setBadgeText({ tabId: $.trackedTabId, text: '👀 🔇' });
      setTimeout(connectToServer, 5 * 1000);
    }
  }
}

class Activity {
  static set(data) {
    data.mood = Activity.prevData?.mood ?? 'none';
    data.nrOfListeners = Activity.prevData?.nrOfListeners ?? 0;
    data.updatedOn = Date.now();
    Activity._update(data);
  }

  static updateMood(mood) {
    if (Activity.on) {
      Activity.prevData.mood = mood;
      Activity._update(Activity.prevData);
    }
  }

  static updateListeners(nrOfListeners) {
    if (Activity.on && Activity.prevData?.nrOfListeners !== nrOfListeners) {
      Activity.prevData.nrOfListeners = nrOfListeners;
      Activity._update(Activity.prevData);
    }
  }
  
  static async remove() {
    console.log('Removing the activity');
    Activity.on = false;
    if (discord.conn) discord.setActivity({ pid: (await browser.windows.getLastFocused()).id });
  }

  static async listenAlong(data) {
    if (data.host !== discord.user.tag) {
      const activity = Activity._createListeningAlongActivity(data);
      
      if (discord.conn) {
        discord.setActivity({
          pid: (await browser.windows.getLastFocused()).id,
          activity,
        });
      }
    }
  }

  static stopListening() {
    if (Activity.on) {
      Activity._update(Activity.prevData);
    }
    else {
      Activity.remove();
    }
  }



  static async _update(data) {
    console.dir(new Error().stack);
    console.log('sending data:', data);

    const activity = (data.host && data.host !== discord.user.tag)
      ? Activity._createListeningAlongActivity(data)
      : (data.paused)
        ? Activity._createPausedActivity(data)
        : Activity._createPlayingActivity(data);

    Activity.on = true;
    Activity.prevData = data;

    if (discord.conn) {
      discord.setActivity({
        pid: (await browser.windows.getLastFocused()).id,
        activity,
      });
    }

    if (server.conn && !data.host) {
      server.sendActivityData(data);
    }
  }

  static _createPlayingActivity(data) {
    let buttons = [{ label: "🎧 Play on YouTube", url: data.URL }];

    if (server.conn) {
      buttons.unshift({ 
        label: `🎉 Listen ${data.nrOfListeners > 0 ? `with ${data.nrOfListeners + 1} friends!` : `along!`}`,
        url: `http://discordradio.tk/d/${discord.user.tag.replace('#', '/')}`,
      });
    }

    if (!data.URL) buttons = undefined;

    return {
      details: data.title,
      state: `via: ${data.channelName}`,
      timestamps: {
        start: data.updatedOn - (1000 * data.currTime)
      },
      assets: {
        large_image: (data.mood !== 'none') ? `mood-${data.mood}` : 'image',
        large_text: Activity._getRandomVibeText(),
        small_image: 'play-circle',
        small_text: 'Playing',
      },
      buttons,
    };
  }

  static _createPausedActivity(data) {
    let buttons = [{ label: "🎧 Play on YouTube", url: data.URL }];

    if (server.conn) {
      buttons.unshift({ 
        label: `🎉 Listen ${data.nrOfListeners > 0 ? `with ${data.nrOfListeners + 1} friends!` : `along!`}`,
        url: `http://discordradio.tk/d/${discord.user.tag.replace('#', '/')}`,
      });
    }

    if (!data.URL) buttons = undefined;

    return {
      details: data.title,
      state: `via: ${data.channelName}`,
      assets: {
        large_image: (![undefined, 'none'].includes(data.mood)) ? `mood-${data.mood}` : 'image',
        large_text: Activity._getRandomVibeText(),
        small_image: 'pause-circle',
        small_text: 'Paused',
      },
      buttons,
    };
  }

  static _createListeningAlongActivity(data) {
    let buttons = [{ label: "🎧 Play on YouTube", url: data.URL }];
    const host = data.host.split('#')[0];
  
    if (server.conn) {
      buttons.unshift({
        label: `🎉 Join along with ${host}!`,
        url: `http://discordradio.tk/d/${data.host.replace('#', '/')}` 
      });
    }

    if (!data.URL) buttons = undefined;
  
    return {
      details: data.title,
      state: `Listening along with ${host}! 🙃`,
      timestamps: {
        start: data.updatedOn - (1000 * data.currTime),
      },
      assets: {
        large_image: (![undefined, 'none'].includes(data.mood)) ? `mood-${data.mood}` : 'image',
        large_text: Activity._getRandomVibeText(),
        small_image: 'play-circle',
        small_text: 'Playing',
      },
      buttons,
    };
  }

  static _getRandomVibeText() {
    return VIBE_TEXTS[Math.floor(Math.random() * VIBE_TEXTS.length)];
  }
}

Activity.prevData = null;
Activity.on = false;



const VIBE_TEXTS = [
  "I'm so happy you're here!",
  "You have a new friend request.",
  "You're looking good today!",
  "You are awesome!",
  "You rock!",
  "You're so rad!",
  "You're so pretty!",
  "You're so smart!",
  "You're so kind!",
  "You're so funny!",
  "You're so sweet!",
  "You're so helpful!",
  "You're the best ever!",
  "You are a genius human being!",
  "You are aIDENTIFIER!",
  "I'm a little teapot",
  "I'm a little short",
  "I'm a little bit of everything",
  "I'm a little bit of just water",
  "You have been successfully connected to Vibe.",
  "I'm a bot, please talk to me!",
  "I'm a bot, I will not talk to you.",
  "I'm not a bot, I will not play music for you.",
  "What do you want to listen to?",
  "I like it when you sing along with me.",
  "I like it when you dance with me.",
  "I like to sing and dance with you.",
  "Let's all sing along :)",
  "What a beautiful day",
  "I really like you",
  "You are so cool, I love you so much",
  "These texts were brought to you by Github Copilot 🤖",
  "Hellö",
  "Griaß enk",
  "I kumm glei wieder",
  "Dos wos unterschiedlich is, is sehr oft auch gleich!",
  "Wow des funktioniert sogar",
  "Jetzt mach ich nen Chrome auf und sag Pfffffffff",
  "Do draussen is da Leiner",
  "Wos hastn Sicherungskostn auf Lego???",
  "Newton wor a geniales Oaschloch",
  "You would like to turn into a Cornetto?"
];
