import http from 'http';
import WebSocket from 'ws';
import fs from 'fs/promises';
import fetch from 'node-fetch';
import process from 'process';
import rpcClient from './rpc.js';
import { requestHandlerFor } from './server.js';
import { updateActivity, state } from './activity.js';


const require = (await import('module')).createRequire(import.meta.url);
const config = require('../../config.json');
let ws;

try {
  console.log('📻 Discord Radio 🎶');
  console.log('-------------------');
  console.log('Discord Rich Presence based on the YouTube video that has been selected.');
  console.log('1. ✨ Start this app and authorise it ✨');
  console.log('2. 🧩 Use the browser extension to select a video (by using the context menu ;))');
  console.log('   📝 If the page doesn\'t get tracked immediately, just refresh it with F5');
  console.log('3. 🕺 Vibe with friends and family! 💃');
  console.log();
  console.log('🔌 Connecting to Discord...');

  const client = await tryConnect(config.client_id);

  console.log('💳 Authorizing...');
  const authConfig = tryRequire('../../auth.json') ?? {};

  const tokenInfo = (authConfig?.refresh_token)
    ? await refreshToken(authConfig.refresh_token)
    : await client.authorize(
      config.client_id,
      config.client_secret,
      ['identify'],
      config.redirect_uri,
    );

  authConfig.refresh_token = tokenInfo.refresh_token;
  await fs.writeFile(new URL('../../auth.json', import.meta.url), JSON.stringify(authConfig, null, 2), 'utf8');

  const { user } = await client.authenticate(
    tokenInfo.access_token,
  );

  config.user = `${user.username}#${user.discriminator}`;
  config.large_image = pickRandomImage();


  console.log('🔌 Connecting to the Server...');

  tryServerConnect(client)

  process.on('SIGINT', $ => {
    if (ws)
      ws.close();
    process.exit();
  });
}
catch (err) {
  console.error(err);
}



function pickRandomImage() {
  const randomImageNr = Math.random();
  return (randomImageNr < 0.01) ? 'image-man' :
    (randomImageNr < 0.02) ? 'image-woman' :
      (randomImageNr < 0.03) ? 'image-bear' :
        'image';
}

function refreshToken(refresh_token) {
  const method = 'POST';
  const url = 'https://discord.com/api/v9/oauth2/token';
  const body = new URLSearchParams({
    refresh_token,
    client_id: config.client_id,
    client_secret: config.client_secret,
    grant_type: 'refresh_token',
  });

  return fetch(url, { method, body }).then(res => res.json());
}

function tryRequire(path) {
  try {
    return require(path);
  }
  catch (err) {
    return undefined;
  }
}

async function tryConnect(client_id) {
  try {
    return await rpcClient(client_id);
  }
  catch (err) {
    console.log('💥 Connection to Discord failed, reconnecting in 15s...');
    await wait(15_000);
    return tryConnect(client_id);
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let retryServerConnectCount = 0, closed = false;
async function tryServerConnect(client) {
  ws = new WebSocket('ws://localhost:420');
  ws.on('open', function open() {
    ws.send(`host://${config.user}`);
    ws.on('message', nrOfListeners => {
      state.lastData.nrOfListeners = parseInt(nrOfListeners);
      updateActivity(client, ws, config, state.lastData);
    });

    if (!closed) {
      setupServer(client, ws)
      console.log('🎉 All set up and ready to go!');
    } else {
      retryServerConnectCount = -1;
      console.log('🤖 Reconnected.')
      console.log()
    }
  });

  ws.on('error', async (e) => {
    if (retryServerConnectCount === 3) {
      console.log('⚡ Connection to server failed, continuing without server connection.');
      if (!closed)
        setupServer(client);
      return
    }
    retryServerConnectCount++;
    console.log('💥 Connection to server failed, reconnecting in 15s...');
    await wait(15_000);
    tryServerConnect(client);
  })

  ws.on('close', async (e) => {
    if (retryServerConnectCount === -1) {
      retryServerConnectCount++;
      closed = true;
      console.log('🔌 Lost connection to server, reconnecting in 15s...');
      await wait(15_000);
      tryServerConnect(client);
    }
  })
}

function setupServer(client, ws) {
  const server = http.createServer(requestHandlerFor(client, ws, config));
  server.listen(6969, () => {
    console.log('📻 Listening for the browser extension.');
    console.log();
    retryServerConnectCount = -1;
  });
}
