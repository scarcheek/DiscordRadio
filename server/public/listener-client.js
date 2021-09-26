const server_uri = 'discordradio.tk';
const server_port = 80;

Array.prototype.last = function () { return this[this.length - 1]; };

let player, hostPlayerState, justCued = false, discord;
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
  };

  ws.onmessage = async e => {
    if (!e.data) return;

    hostPlayerState = JSON.parse(e.data);
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
  console.log(`🚀 ~ onPlayerStateChange 1 ~ hostPlayerState.currTime`, hostPlayerState?.currTime);
  console.dir(event);

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
  const videoId = player.getVideoUrl().split('v=')[1];
  console.group(new Date().toLocaleTimeString("at"));
  console.dir(videoId);
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
  console.log('Sending data:', data)
  
  discord.setActivity(createListeningAlongActivity(data));
}


function createListeningAlongActivity(data) {
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
