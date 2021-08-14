module.exports = {
  createPausedActivity,
  createPlayingActivity,
  updateActivity,
};



function createPausedActivity(data, large_image, large_text) {
  return {
    details: data.title,
    state: `via: ${data.channelName}`,
    assets: {
      large_image,
      large_text,
      small_image: 'pause-circle',
      small_text: 'Paused',
    },
    buttons: [
      { label: "🎧 Play on YouTube", url: data.URL },
    ],
  };
}

function createPlayingActivity(data, large_image, large_text) {
  return {
    details: data.title,
    state: `via: ${data.channelName}`,
    timestamps: {
      start: Date.now() - 1000 * data.currTime
    },
    assets: {
      large_image,
      large_text,
      small_image: 'play-circle',
      small_text: 'Playing',
    },
    buttons: [
      { label: "🎉 Listen Along", url: `${data.URL}&t=${data.currTime + 5}` },
      { label: "🎧 Play on YouTube", url: data.URL },
    ],
  };
}

function updateActivity(client, config, data) {
  const large_text = pickRandomText(config.vibe_texts);
  const activity = (data.paused)
    ? createPausedActivity(data, config.large_image, large_text)
    : createPlayingActivity(data, config.large_image, large_text);

  client.setActivity(activity);
}

function pickRandomText(texts) {
  return texts[Math.floor(Math.random() * texts.length)];
}

