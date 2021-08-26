import fs from 'fs/promises';
import fetch from 'node-fetch';
import rpcClient from './utils/rpc.js';
import $ from './state.js';

export default async function connectToDiscord(config) {
  try {
    $.discordConn = await tryConnect(config.client_id);
    await login($.discordConn, config);
  }
  catch (err) {
    console.error(err);
  }
}


async function tryConnect(client_id, isRetry = false) {
  try {
    return await rpcClient(client_id);
  }
  catch (err) {
    if (isRetry) {
      console.log('💥 Connection to Discord failed, reconnecting in 15s...');
      await wait(15_000);
    }
    else { // first retry
      console.log('💥 Connection to Discord failed, reconnecting in 5s...');
      await wait(5_000);
    }
    
    return tryConnect(client_id, false);
  }
}

async function login(client, config) {
  console.log('💳 Authorizing...');
  const authConfig = await tryRequire('../../auth.json') ?? {};

  const tokenInfo = (authConfig?.refresh_token)
    ? await refreshToken(authConfig.refresh_token, config)
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
}

function refreshToken(refresh_token, config) {
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



function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tryRequire(path) {
  try {
    const require = (await import('module')).createRequire(import.meta.url);
    return require(path);
  }
  catch (err) {
    return undefined;
  }
}
