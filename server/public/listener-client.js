const server_uri = 'discordradio.tk';
const server_port = 80;

Array.prototype.last = function() { return this[this.length - 1]; };

let player, hostPlayerState, prevState;
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

  const ws = new WebSocket(`ws://${server_uri}:420`);
  ws.onopen = async () => {
    ws.send(window.location);
    window.onbeforeunload = () => ws.close();
  };

  ws.onmessage = async e => {
    if (!e.data) return;

    hostPlayerState = JSON.parse(e.data);
    updateDiscordRPC({ host, ...hostPlayerState});
    hostPlayerState.currTime += (Date.now() - hostPlayerState.updatedOn) / 1000;
    hostPlayerState.playedOn = Date.now();
    hostPlayerState.videoId = hostPlayerState.URL.match(/[?&]v=([^&]*)/)[1];
    
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
  else if (prevState !== YT.PlayerState.BUFFERING && event.data === YT.PlayerState.PLAYING) {
    hostPlayerState.currTime += (Date.now() - hostPlayerState.playedOn) / 1000;
    hostPlayerState.playedOn = Date.now();
    player.seekTo(hostPlayerState.currTime);
  }

  prevState = event.data;
}

async function loadNewVideo() {
  console.log('Loading new video...');
  const videoId = player.getVideoUrl().split('v=')[1];
  console.group(new Date().toLocaleTimeString("at"));
  console.dir(videoId);
  console.dir(hostPlayerState);
  console.groupEnd();

  player.cueVideoById(hostPlayerState.videoId, hostPlayerState.currTime);
}

async function updatePlayer() {
  console.log('Updating the player...');
  const videoId = player.getVideoUrl().split('v=')[1];
  console.group(new Date().toLocaleTimeString("at"));
  console.dir(videoId);
  console.dir(hostPlayerState);
  console.groupEnd();

  await player.seekTo(hostPlayerState.currTime);

  if (hostPlayerState.paused) player.pauseVideo();
  else player.playVideo();
}

function updateDiscordRPC(data) {
  if (!data) return;
  console.log('Sending data:', data)

  fetch(`http://localhost:6969`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
  }).catch((err) => console.error(err.message));
  // thnx Loris for the code
}
