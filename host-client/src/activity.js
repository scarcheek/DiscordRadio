import $ from './state.js';

export function updateActivity(data, config) {
  data.nrOfListeners = $.nrOfListeners;
  $.currActivityData = data;

  const large_text = pickRandomText(config.vibe_texts);
  const activity = (data.host)
    ? createListeningAlongActivity(data, config, large_text, !!$.serverConn)
    : (data.paused)
      ? createPausedActivity(data, config, large_text)
      : createPlayingActivity(data, config, large_text, !!$.serverConn);

  $.discordConn.setActivity(activity);
  if ($.serverConn) $.serverConn.send(JSON.stringify(data));
}

function createPausedActivity(data, config, large_text) {
  return {
    details: data.title,
    state: `via: ${data.channelName}`,
    assets: {
      large_image: (![undefined, 'none'].includes(data.mood)) ? `mood-${data.mood}` : 'image',
      large_text,
      small_image: 'pause-circle',
      small_text: 'Paused',
    },
    buttons: [
      { label: "🎧 Play on YouTube", url: data.URL },
    ],
  };
}

function createPlayingActivity(data, config, large_text, listenAlong) {
  const buttons = [{ label: "🎧 Play on YouTube", url: data.URL }];

  if (listenAlong) {
    buttons.unshift({ 
      label: `🎉 Listen ${data.nrOfListeners > 0 ? `with ${data.nrOfListeners + 1} friends!` : `along!`}`, 
      url: `http://${config.server_uri}:${(config.server_port != 80) ? config.server_port : ''}/${config.user}` 
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
      large_text,
      small_image: 'play-circle',
      small_text: 'Playing',
    },
    buttons,
  };
}

function createListeningAlongActivity(data, config, large_text, listenAlong) {
  const buttons = [{ label: "🎧 Play on YouTube", url: data.URL }];
  const host = data.host.split('#')[0];

  if (data.host !== $.listenAlong.host) {
    $.listenAlong.host = data.host;
    $.listenAlong.startTime = Date.now();
  }

  if (listenAlong) {
    buttons.unshift({ 
      label: `🎉 Listen with ${host} & friends!`, 
      url: `http://${config.server_uri}:${(config.server_port != 80) ? config.server_port : ''}/${data.host}` 
    });
  }

  return {
    details: data.title,
    state: `Listening along with ${host}! 🙃`,
    timestamps: {
      start: $.listenAlong.startTime,
    },
    assets: {
      large_image: (![undefined, 'none'].includes(data.mood)) ? `mood-${data.mood}` : 'image',
      large_text,
      small_image: 'play-circle',
      small_text: 'Playing',
    },
    buttons,
  };
}

function pickRandomText(texts) {
  return texts[Math.floor(Math.random() * texts.length)];
}
