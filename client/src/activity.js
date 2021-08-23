export function updateActivity(client, ws, config, data) {
  const large_text = pickRandomText(config.vibe_texts);
  const activity = (data.paused)
    ? createPausedActivity(data, config, large_text)
    : createPlayingActivity(data, config, large_text);

  client.setActivity(activity);

  console.dir(data);
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

function createPlayingActivity(data, config, large_text) {
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
    buttons: [
      { label: "🎉 Listen Along", url: `http://localhost:42069/${config.user}` },
      { label: "🎧 Play on YouTube", url: data.URL },
    ],
  };
}

function pickRandomText(texts) {
  return texts[Math.floor(Math.random() * texts.length)];
}
