import fetch from 'node-fetch';
import { v4 as uuid } from 'uuid';
import ipcClient from './infrastructure/ipc.js';

/** @typedef {import('../@types/infrastructure/ipc').IpcClient} IpcClient */
/** @typedef {import('../@types/rpc').RpcClient} RpcClient */
/** @typedef {import('../@types/rpc').RpcConnection} RpcConnection */
/** @typedef {import('../@types/rpc').TokenInfo} TokenInfo */
/** @typedef {import('../@types/rpc').AuthInfo} AuthInfo */
/** @typedef {import('../@types/rpc').Activity} Activity */

// Discord base rpc path
const BASE_PATH = '//?/pipe/discord-ipc-'.replaceAll('/', '\\');



/**
 * A stateless RPC client which partially applies all the exported functions of this module.
 * @param {string} client_id The Discord client ID.
 * @param {number} version The Discord RPC API version. 
 * @return {Promise<RpcClient>} A RPC client.
 */
export default async function(client_id, version = 1) {
  const {client, data} = await connect(client_id, version);

  return {
    connectionResponse: data,
    authorize: (client_id, client_secret, scopes, redirect_uri) => 
      authorize(client, client_id, client_secret, scopes, redirect_uri),
    authenticate: (access_token) => authenticate(client, access_token),
    login: (client_id, client_secret, scopes, redirect_uri) =>
      login(client, client_id, client_secret, scopes, redirect_uri),
    on: (event, handler) => on(client, event, handler),
    setActivity: (activity) => setActivity(client, activity),
  };
};

/**
 * Connects to the Discord IPC socket and shakes hands with it.
 * @param {string} client_id The Discord client ID.
 * @param {number} version The Discord RPC API version. 
 * @return {Promise<RpcConnection>} The connected IPC client and handshake response data.
 */
export async function connect(client_id, version = 1) {
  const client = await connectDiscordIpcClient(client_id, version);
  const { payload } = await client.handshake({ client_id, v: version });
  return { client, data: payload.data };
}

/**
 * Asks the Discord user to authorize the client.
 * @param {IpcClient} client The Discord IPC client.
 * @param {string} client_id The OAuth client ID of the application.
 * @param {string} client_secret The OAuth client secret of the application.
 * @param {string[]} scopes The OAuth scopes of the application.
 * @param {string} redirect_uri The OAuth redirect URI of the application.
 * @return {Promise<TokenInfo>} The Discord token info.
 */
export async function authorize(client, client_id, client_secret, scopes, redirect_uri) {
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

/**
 * Authenticates the client to Discord IPC socket.
 * @param {IpcClient} client The Discord IPC client.
 * @param {string} access_token The OAuth access token.
 * @return {Promise<AuthInfo>} The Discord authentication info.
 */
export async function authenticate(client, access_token) {
  const { payload } = await client.sendAndReceiveFrame({
    cmd: 'AUTHENTICATE',
    nonce: uuid(),
    args: {
      access_token
    },
  });

  return payload.data;
}

/**
 * Authorizes and authenticates the client to Discord IPC socket.
 * @param {IpcClient} client The Discord IPC client.
 * @param {string} client_id The OAuth client ID of the application.
 * @param {string} client_secret The OAuth client secret of the application.
 * @param {string[]} scopes The OAuth scopes of the application.
 * @param {string} redirect_uri The OAuth redirect URI of the application.
 * @return {Promise<AuthInfo>} The Discord authentication info.
 */
export async function login(client, client_id, client_secret, scopes, redirect_uri) {
  const {access_token} = await authorize(client, client_id, client_secret, scopes, redirect_uri);
  return authenticate(client, access_token);
}

/**
 * Add an RPC event listener to the client.
 * @param {IpcClient} client The client to listen for events on.
 * @param {'response'} event The event to listen for.
 * @param {(payload: any) => any} handler The handler to call when the event is emitted.
 */
export function on(client, event, handler) {
  if (event !== 'response') return;
  client.on('receive', ({payload}) => handler(payload));
}

/**
 * Used to update a user's Rich Presence.
 * @param {IpcClient} client The client to set the activity on.
 * @param {Activity} activity The activity to set.
 */
export function setActivity(client, activity) {
  client.sendFrame({
    cmd: 'SET_ACTIVITY',
    nonce: uuid(),
    args: {
      pid: process.pid,
      activity,
    },
  });
}



/**
 * Searches the Discord IPC socket and connects to it.
 * @return {IpcClient} The connected IPC client.
 */
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
