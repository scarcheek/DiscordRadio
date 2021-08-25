export const state = {
  lastData: {
    nrOfListeners: 0,
  },
};

export function updateActivity(client, ws, config, data) {
  data.nrOfListeners = state.lastData.nrOfListeners;
  state.lastData = data;

  const large_text = pickRandomText(config.vibe_texts);
  const activity = (data.paused)
    ? createPausedActivity(data, config, large_text)
    : createPlayingActivity(data, config, large_text, !!ws);

  client.setActivity(activity);
  if (ws)
    ws.send(JSON.stringify(data));
}

function createPausedActivity(data, config, large_text) {
  return {
    details: data.title,
    state: `via: ${data.channelName}`,
    assets: {
      large_image: (![undefined, 'none'].includes(data.mood)) ? `mood-${data.mood}` : config.large_image,
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
  let buttons = [];

  if (listenAlong) {
    buttons.push({ label: `🎉 Listen ${data.nrOfListeners > 0 ? `with ${data.nrOfListeners + 1} friends!` : `along!`}`, url: `http://${config.server_uri}:42069/${config.user}` });
  }
  buttons.push({ label: "🎧 Play on YouTube", url: data.URL });
  return {
    details: data.title,
    state: `via: ${data.channelName}`,
    timestamps: {
      start: Date.now() - 1000 * data.currTime
    },
    assets: {
      large_image: (![undefined, 'none'].includes(data.mood)) ? `mood-${data.mood}` : config.large_image,
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
