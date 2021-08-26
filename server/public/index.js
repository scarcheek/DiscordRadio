const server_uri = 'discordradio.tk';
const server_port = '80'

let player, hostPlayerState;
document.title = `Listening to: ${window.location.toString().split('/')[window.location.toString().split('/').length - 1]}`;



function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '100%',
    width: '100%',
    videoId: 'dQw4w9WgXcQ',
    playerVars: {
      'autoplay': 1,
      'enablejsapi': 1,
      'iv_load_policy': 3,
      'modestbranding': 1,
      'origin': `http://${server_uri}:${server_port}`,
      'rel': 0,
      'controls': 0,
      'disablekb': 1,
    },
    events: {
      'onReady': onPlayerReady,
    },
  });
}

async function onPlayerReady() {
  const ws = new WebSocket(`ws://${server_uri}:420`);
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
  await player.loadVideoById(hostPlayerState.videoId, hostPlayerState.currTime);

  if (hostPlayerState.paused) player.pauseVideo();
  else player.playVideo();
}

async function updatePlayer() {
  await player.seekTo(hostPlayerState.currTime);

  if (hostPlayerState.paused) player.pauseVideo();
  else player.playVideo();
}

window.addEventListener('keydown', (e) => {
  const playerVolume = player.getVolume();
  let newVolume;
  switch (e.code) {
    case 'ArrowDown':
      newVolume = Math.max((playerVolume - 5), 0)
      player.setVolume(newVolume)
      showSnackbar(`${newVolume}%`)
      break;
    case 'ArrowUp':
      newVolume = Math.min((playerVolume + 5), 100)
      player.setVolume(Math.min((playerVolume + 5), 100))
      showSnackbar(`${newVolume}%`)
      break;
    case 'KeyM':
      if (player.isMuted()) {
        player.unMute();
        showSnackbar('Unmuted')
      }
      else {
        player.mute()
        showSnackbar('Muted')
      }
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

function showSnackbar(text) {
  const snackbar = document.querySelector('#snackbar')
  snackbar.className = "show"
  snackbar.innerText = text
  setTimeout(function () {
    snackbar.className = "";
  }, 3000);
}