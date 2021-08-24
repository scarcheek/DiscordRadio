let player, hostPlayerState;
document.title = `Listening to: ${(window.location).toString().replace('http://localhost:42069/', '')}`;

function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '100%',
    width: '100%',
    playerVars: {
      'autoplay': 1,
      'enablejsapi': 1,
      'iv_load_policy': 3,
      'modestbranding': 1,
      'origin': 'http://localhost:42069',
      'rel': 0,
      'controls': 0,
      'disablekb': 1
    },
    events: {
      'onReady': onPlayerReady,
    },
  });
}

async function onPlayerReady() {
  const ws = new WebSocket('ws://localhost:420');
  ws.onopen = async () => {
    ws.send(window.location);
    window.onbeforeunload = $ => ws.close();
  };

  ws.onmessage = async (e) => {
    if (!e.data) return;

    hostPlayerState = JSON.parse(e.data);
    hostPlayerState.currTime += (Date.now() - hostPlayerState.updatedOn) / 1000;
    hostPlayerState.initializedOn = Date.now();
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

async function loadNewVideo() {
  player.loadVideoById(hostPlayerState.videoId, hostPlayerState.currTime);

  if (hostPlayerState.paused) player.pauseVideo();
  else player.playVideo();
}

async function updatePlayer() {
  player.seekTo(hostPlayerState.currTime);

  if (hostPlayerState.paused) player.pauseVideo();
  else player.playVideo();
}

window.addEventListener('keydown', (e) => {
  const playerVolume = player.getVolume();
  switch (e.code) {
    case 'ArrowDown':
      player.setVolume(Math.max((playerVolume - 2.5), 0))
      break;
    case 'ArrowUp':
      player.setVolume(Math.min((playerVolume + 2.5), 100))
      break;
    case 'KeyM':
      player.isMuted() ? player.unMute() : player.mute()
      break;
    case 'Space':
      if (player.getPlayerState() === 1)
        player.pauseVideo()
      else if (player.getPlayerState() === 2) {
        player.playVideo()

        hostPlayerState.currTime += (Date.now() - hostPlayerState.initializedOn) / 1000;
        player.seekTo(hostPlayerState.currTime);
      }
      break;
  }
})