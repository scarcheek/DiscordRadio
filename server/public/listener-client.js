const server_uri = 'discordradio.tk';
const server_port = 80;

Array.prototype.last = function() { return this[this.length - 1]; };

let player, hostPlayerState, prevState = YT.PlayerState.UNSTARTED;
document.title = `Listening to: ${window.location.toString().split('/').last()}`;

function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '100%',
    width: '100%',
    playerVars: {
      iv_load_policy: 3,
      modestbranding: 1,
      origin: `http://${server_uri}:${server_port}`,
      rel: 0,
      disablekb: 1,
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
    console.log('Sending listener url to the server...');
    ws.send(window.location);
    window.onbeforeunload = () => ws.close();
  };

  ws.onmessage = async (e) => {
    console.log('Received a message from the server...');
    if (!e.data) return;

    hostPlayerState = JSON.parse(e.data);
    hostPlayerState.currTime += (Date.now() - hostPlayerState.updatedOn) / 1000;
    hostPlayerState.playedOn = Date.now();
    hostPlayerState.videoId = hostPlayerState.URL.match(/[?&]v=([^&]*)/)[1];
    console.log('Received player state:', hostPlayerState);
    
    const currVideoUrl = player.getVideoUrl();
    const currVideoId = (currVideoUrl?.includes('v=')) ? currVideoUrl.match(/[?&]v=([^&]*)/)[1] : undefined;

    if (currVideoId !== hostPlayerState.videoId) loadNewVideo(readyEvent);
    else updatePlayer();
  };

  ws.onerror = (e) => {
    console.log('YouTube has problems. Listen to them: ', e)
  }
}

async function onPlayerStateChange(event) {
  console.log('Player state changed:', event.data);

  if (event.data === YT.PlayerState.CUED) {
    console.log('Player video ready');

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

async function loadNewVideo(readyEvent) {
  console.log('Loading new video...');
  player.cueVideoById(hostPlayerState.videoId, hostPlayerState.currTime);
}

async function updatePlayer() {
  await player.seekTo(hostPlayerState.currTime);

  if (hostPlayerState.paused) player.pauseVideo();
  else player.playVideo();
}
