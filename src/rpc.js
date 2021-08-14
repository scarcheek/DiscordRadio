const fetch = require('node-fetch');
const { v4: uuid } = require('uuid');
const ipcClient = require('./infrastructure/ipc.js');

// Discord base rpc path
const BASE_PATH = '//?/pipe/discord-ipc-'.replaceAll('/', '\\');



async function connectDiscordIpcClient() {
  for (let id = 0; id < 10; id++) {
    try {
      const client = await ipcClient(BASE_PATH + id);
      client._ipcId = id;
      return client;
    }
    catch (err) {
      // try next path
    }
  }

  throw new Error('Unable to connect to the Discord client!');
}

async function connect(client_id, version = 1) {
  const client = await connectDiscordIpcClient(client_id, version);
  const { payload } = await client.handshake({ client_id, v: version });
  return { client, data: payload.data };
}

async function authorize(client, client_id, client_secret, scopes, redirect_uri) {
  const { payload } = await client.sendAndReceiveFrame({
    cmd: 'AUTHORIZE',
    nonce: uuid(),
    args: {
      client_id,
      scopes,
    },
  });

  const { data: {code} } = payload;
  
  const method = 'POST';
  const url = 'https://discord.com/api/v9/oauth2/token';
  const body = new URLSearchParams({
    code,
    client_id,
    client_secret,
    grant_type: 'authorization_code',
    redirect_uri,
  });

  return fetch(url, { method, body }).then(res => res.json());
}

async function authenticate(client, access_token) {
  const { payload } = await client.sendAndReceiveFrame({
    cmd: 'AUTHENTICATE',
    nonce: uuid(),
    args: {
      access_token
    },
  });

  return payload.data;
}

async function login(client, client_id, client_secret, scopes, redirect_uri) {
  const {access_token} = await authorize(client, client_id, client_secret, scopes, redirect_uri);
  return authenticate(client, access_token);
}

function on(client, event, handler) {
  if (event !== 'response') return;
  client.on('receive', ({payload}) => handler(payload));
}

function setActivity(client, activity) {
  client.sendFrame({
    cmd: 'SET_ACTIVITY',
    nonce: uuid(),
    args: {
      pid: process.pid,
      activity,
    },
  });
}



module.exports = async function(client_id, version = 1) {
  const {client, data} = await connect(client_id, version);

  return {
    connectData: data,
    authorize: (client_id, client_secret, scopes, redirect_uri) => 
      authorize(client, client_id, client_secret, scopes, redirect_uri),
    authenticate: (access_token) => authenticate(client, access_token),
    login: (client_id, client_secret, scopes, redirect_uri) =>
      login(client, client_id, client_secret, scopes, redirect_uri),
    on: (event, handler) => on(client, event, handler),
    setActivity: (activity) => setActivity(client, activity),
  };
};

module.exports.connect = connect;
module.exports.authorize = authorize;
module.exports.authenticate = authenticate;
module.exports.login = login;
module.exports.on = on;
module.exports.setActivity = setActivity;
