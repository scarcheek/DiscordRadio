let player;

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
    window.onbeforeunload =$=> ws.close();
  };

  ws.onmessage = async (e) => {
    if (!e.data) return;

    const hostPlayerState = JSON.parse(e.data);
    hostPlayerState.currTime += (Date.now() - hostPlayerState.updatedOn) / 1000;
    hostPlayerState.videoId = hostPlayerState.URL.match(/[?&]v=([^&]*)/)[1];

    const currVideoUrl = player.getVideoUrl();
    const currVideoId = (currVideoUrl?.includes('v=')) ? currVideoUrl.match(/[?&]v=([^&]*)/)[1] : undefined;

    if (currVideoId !== hostPlayerState.videoId) loadNewVideo(hostPlayerState);
    else updatePlayer(hostPlayerState);
  };
}

async function loadNewVideo(hostPlayerState) {
  player.loadVideoById(hostPlayerState.videoId, hostPlayerState.currTime);

  if (hostPlayerState.paused) player.pauseVideo();
  else player.playVideo();
}

async function updatePlayer(hostPlayerState) {
  player.seekTo(hostPlayerState.currTime);

  if (hostPlayerState.paused) player.pauseVideo();
  else player.playVideo();
}
