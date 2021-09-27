const server_uri = 'discordradio.tk';
const server_port = 80;

Array.prototype.last = function () { return this[this.length - 1]; };

let player, hostPlayerState = {}, justCued = false, discord;
const host = location.href.split('/').last();
document.title = `Listening to: ${host}`;

function onYouTubeIframeAPIReady() {
  prevState = YT.PlayerState.UNSTARTED;
  player = new YT.Player('player', {
    height: '100%',
    width: '100%',
    playerVars: {
      iv_load_policy: 3,
      modestbranding: 1,
      origin: `http://${server_uri}:${server_port}`,
      rel: 0,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    },
  });
}

async function onPlayerReady(readyEvent) {
  console.log('Player ready:', readyEvent);

  // init discord connection
  discord = new DiscordRPC('875518867680657458');
  await discord.connect();

  const ws = new WebSocket(`ws://${server_uri}:420`);
  ws.onopen = async () => {
    ws.send(window.location);
    window.onbeforeunload = () => ws.close();

    hostPlayerState.initializedOn = Date.now();
  };

  ws.onmessage = async e => {
    if (!e.data) return;

    hostPlayerState = {...hostPlayerState, ...JSON.parse(e.data)};
    hostPlayerState.currTime += (Date.now() - hostPlayerState.updatedOn) / 1000;
    hostPlayerState.playedOn = Date.now();
    hostPlayerState.videoId = hostPlayerState.URL.match(/[?&]v=([^&]*)/)[1];
    console.log(`🚀 ~ onPlayerReady ~ hostPlayerState.currTime`, hostPlayerState.currTime);
    updateDiscordRPC({ host, ...hostPlayerState });

    const currVideoUrl = player.getVideoUrl();
    const currVideoId = (currVideoUrl?.includes('v=')) ? currVideoUrl.match(/[?&]v=([^&]*)/)[1] : undefined;

    if (currVideoId !== hostPlayerState.videoId) loadNewVideo();
    else updatePlayer();
  };

  ws.onerror = (e) => {
    console.log('YouTube has problems. Listen to them: ', e)
  }
}

async function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.CUED) {
    if (hostPlayerState.paused) event.target.pauseVideo();
    else event.target.playVideo();
  }
  else if (justCued && event.data === YT.PlayerState.PLAYING) {
    hostPlayerState.currTime += (Date.now() - hostPlayerState.playedOn) / 1000;
    console.log(`🚀 ~ onPlayerStateChange 2 ~ hostPlayerState.currTime`, hostPlayerState.currTime);
    hostPlayerState.playedOn = Date.now();
    player.seekTo(hostPlayerState.currTime);
    justCued = false;
  }
  else if (event.data === YT.PlayerState.PAUSED) {
    justCued = true
  }
}

async function loadNewVideo() {
  console.log('Loading new video...');
  console.group(new Date().toLocaleTimeString("at"));
  console.dir(hostPlayerState);
  console.groupEnd();

  player.cueVideoById(hostPlayerState.videoId, hostPlayerState.currTime);
  justCued = true;
}

async function updatePlayer() {
  console.log('Updating the player...');
  const videoId = player.getVideoUrl().split('v=')[1];
  console.group(new Date().toLocaleTimeString("at"));
  console.dir(videoId);
  console.dir(hostPlayerState);
  console.groupEnd();

  await player.seekTo(hostPlayerState.currTime);
  console.log(`🚀 ~ updatePlayer ~ hostPlayerState.currTime`, hostPlayerState.currTime);

  if (hostPlayerState.paused) player.pauseVideo();
  else player.playVideo();
}

function updateDiscordRPC(data) {
  if (!data) return;
  let activityData = createListeningAlongActivity(data)
  console.log('Sending data:', activityData)

  ws.send(activityData);
}


function createListeningAlongActivity(data) {
  const buttons = [{ label: "🎧 Play on YouTube", url: data.URL }];
  const host = data.host.split('#')[0];

  buttons.unshift({
    label: `🎉 Join along with ${host}!`,
    url: `http://discordradio.tk/${data.host}`
  });


  return {
    details: data.title,
    state: `Listening along with ${host}! 🙃`,
    timestamps: {
      start: hostPlayerState.initializedOn,
    },
    assets: {
      large_image: (![undefined, 'none'].includes(data.mood)) ? `mood-${data.mood}` : 'image',
      large_text: getRandomVibeText(),
      small_image: 'play-circle',
      small_text: 'Playing',
    },
    buttons,
  };
}


function getRandomVibeText() {
  return VIBE_TEXTS[Math.floor(Math.random() * VIBE_TEXTS.length)];
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
