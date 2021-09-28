const MESSAGES = {
  hostData: 'hostData',
};

const server_uri = 'discordradio.tk';
const server_port = 80;
const host = getHost();

let player, hostPlayerState = {}, justCued = false;

const $nrOfListeners = document.querySelector('#nrOfListeners');
const $playerInfo = document.querySelector('#player-info');
const $playerStatus = $playerInfo.querySelector('#player-status');
const $playerInfoText = $playerInfo.querySelector('#player-info-text');
const $popup = document.querySelector('#popup');
const $popupMessage = $popup.querySelector('#popup-message');

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
  $popupMessage.innerText = `${host} is not listening to any music on Discord Radio at the moment! 🙈`;

  const ws = new WebSocket(`ws://${server_uri}:420`);
  ws.addEventListener('open', async () => {
    ws.send(window.location);
    window.onbeforeunload = () => ws.close();

    $playerStatus.innerText = '🥳';
    $playerStatus.title = 'Connected!';
  });

  ws.addEventListener('message', async e => {
    if (!e.data) return;

    hostPlayerState = JSON.parse(e.data);
    hostPlayerState.currTime += Math.max((Date.now() - hostPlayerState.updatedOn) / 1000, 0);
    hostPlayerState.playedOn = Date.now();
    hostPlayerState.videoId = hostPlayerState.URL.match(/[?&]v=([^&]*)/)[1];
    window.postMessage({ type: MESSAGES.hostData, data: { ...hostPlayerState, host } }, '*');

    const currVideoUrl = player.getVideoUrl();
    const currVideoId = (currVideoUrl?.includes('v=')) ? currVideoUrl.match(/[?&]v=([^&]*)/)[1] : undefined;

    if (currVideoId !== hostPlayerState.videoId) loadNewVideo();
    else updatePlayer();

    $popup.classList.remove('visible');
    $playerInfo.classList.add('visible');
    $playerInfoText.innerText = `Listening to: ${hostPlayerState.title}`;

    if (hostPlayerState.nrOfListeners < 1) $nrOfListeners.innerText = '';
    else if (hostPlayerState.nrOfListeners === 1) $nrOfListeners.innerText = ` & 1 other`;
    else $nrOfListeners.innerText = ` & ${hostPlayerState.nrOfListeners} others`;
  });

  ws.addEventListener('error', e => {
    console.log('YouTube has problems. Listen to them: ', e)
  });
}

async function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.CUED) {
    if (hostPlayerState.paused) event.target.pauseVideo();
    else event.target.playVideo();
  }
  else if (justCued && event.data === YT.PlayerState.PLAYING) {
    hostPlayerState.currTime += Math.max((Date.now() - hostPlayerState.playedOn) / 1000, 0);
    hostPlayerState.playedOn = Date.now();
    player.seekTo(hostPlayerState.currTime);
    justCued = false;
  }
  else if (event.data === YT.PlayerState.PAUSED) {
    justCued = true
  }
}

async function loadNewVideo() {
  player.cueVideoById(hostPlayerState.videoId, hostPlayerState.currTime);
  justCued = true;
}

async function updatePlayer() {
  await player.seekTo(hostPlayerState.currTime);

  if (hostPlayerState.paused) player.pauseVideo();
  else player.playVideo();
}

function getHost() {
  const urlParts = location.href.split('/');
  return `${urlParts[urlParts.length - 2]}#${urlParts[urlParts.length - 1]}`;
}
