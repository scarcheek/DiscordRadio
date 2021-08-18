import http from 'http';
import fs from 'fs/promises';
import fetch from 'node-fetch';
import rpcClient from './rpc.js';
import { requestHandlerFor } from './server.js';

const require = (await import('module')).createRequire(import.meta.url);
const config = require('../../config.json');



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

  await client.authenticate(
    tokenInfo.access_token,
  );

  config.large_image = pickRandomImage();
  const server = http.createServer( requestHandlerFor(client, config) );
  server.listen(6969, () => {
    console.log('🎉 All set up and ready to go!');
    console.log('📻 Listening for the browser extension.');
    console.log();
  });
}
catch (err) {
  console.error(err);
}



function pickRandomImage() {
  const randomImageNr = Math.random();
  return  (randomImageNr < 0.01) ? 'image-man' :
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
    return tryConnect(client_id);
  }
}
