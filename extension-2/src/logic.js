let discord, server;

browser.runtime.onStartup.addListener(connect);
browser.runtime.onInstalled.addListener(async () => {
  await browser.storage.sync.set({ 
    client_secret: 'dihMntY3A_LVfiYCY_5EOJQn5XRDR4l3',
    redirect_uri: 'http://localhost:6969',
  });

  connect();
});
  
async function connect() {
  // connect to discord
  discord = new DiscordRPC('875518867680657458');
  await discord.connect();
  chrome.storage.sync.set({ link: `http://discordradio.tk/${discord.user.tag}` });

  // auth to discord
  const authInfo = await browser.storage.sync.get(['client_secret', 'refresh_token', 'redirect_uri']);
  const { refresh_token } = await discord.login(authInfo);
  browser.storage.sync.set({ refresh_token });
  
  discord.on('message', console.dir);
  discord.on('close', (...args) => {
    console.error('Discord connection closed', ...args);
  });

  // connect to the discord radio server
  server = new DiscordRadioServer();
  await server.connect(discord.user);
  server.on('close', (...args) => {
    console.error('Server connection closed', ...args);
  });

  server.on('message', nrOfListeners => {
    if (nrOfListeners > 0 && Activity.prevData) {
      browser.browserAction.setBadgeText({ text: `🥳 ${nrOfListeners + 1}` });
      browser.browserAction.setBadgeText({ tabId: $.trackedTabId, text: `✔ ${nrOfListeners + 1}` });
    }
    else {
      browser.browserAction.setBadgeText({ text: '' });
      if (Activity.prevData) browser.browserAction.setBadgeText({ tabId: $.trackedTabId, text: '✔' });
    }

    Activity.updateListeners(nrOfListeners);
  });
}

class Activity {
  static prevData;
  static listenData = {};

  static async set(data) {
    data.nrOfListeners = Activity.prevData?.nrOfListeners ?? 0;
    const activity = (data.host && data.host !== discord.user.tag)
      ? Activity._createListeningAlongActivity(data)
      : (data.paused)
        ? Activity._createPausedActivity(data)
        : Activity._createPlayingActivity(data);

    discord.setActivity({
      pid: (await browser.windows.getLastFocused()).id,
      activity,
    });

    if (server.conn && !data.host) server.sendActivityData(data);
    Activity.prevData = data;
  }

  static resendPrevData() {
    if (Activity.prevData) {
      Activity.set(Activity.prevData);
    }
  }

  static updateListeners(nrOfListeners) {
    if (Activity.prevData) {
      Activity.prevData.nrOfListeners = nrOfListeners;
      Activity.set(Activity.prevData);
    }
  }
  
  static async remove() {
    Activity.prevData = null;
    discord.setActivity({ pid: (await browser.windows.getLastFocused()).id });
  }

  static async listenAlong(data) {
    if (data.host !== discord.user.tag) {
      const activity = Activity._createListeningAlongActivity(data);
      discord.setActivity({
        pid: (await browser.windows.getLastFocused()).id,
        activity,
      });
    }
  }

  static stopListening() {
    if (Activity.prevData) {
      Activity.set(Activity.prevData);
    }
    else {
      Activity.remove();
    }
  }



  static _createPlayingActivity(data) {
    const buttons = [{ label: "🎧 Play on YouTube", url: data.URL }];

    if (server.conn) {
      buttons.unshift({ 
        label: `🎉 Listen ${data.nrOfListeners > 0 ? `with ${data.nrOfListeners + 1} friends!` : `along!`}`,
        url: `http://discordradio.tk/${discord.user.tag}`,
      });
    }

    return {
      details: data.title,
      state: `via: ${data.channelName}`,
      timestamps: {
        start: data.updatedOn - (1000 * data.currTime)
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

  static _createPausedActivity(data) {
    const buttons = [{ label: "🎧 Play on YouTube", url: data.URL }];

    if (server.conn) {
      buttons.unshift({ 
        label: `🎉 Listen ${data.nrOfListeners > 0 ? `with ${data.nrOfListeners + 1} friends!` : `along!`}`,
        url: `http://discordradio.tk/${discord.user.tag}`,
      });
    }

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
    const buttons = [{ label: "🎧 Play on YouTube", url: data.URL }];
    const host = data.host.split('#')[0];
  
    if (data.host !== Activity.listenData?.host) {
      Activity.listenData.host = data.host;
      Activity.listenData.startTime = Date.now();
    }
  
    if (server.conn) {
      buttons.unshift({
        label: `🎉 Join along with ${host}!`,
        url: `http://discordradio.tk/${data.host}` 
      });
    }
  
    return {
      details: data.title,
      state: `Listening along with ${host}! 🙃`,
      timestamps: {
        start: Activity.listenData.startTime,
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
