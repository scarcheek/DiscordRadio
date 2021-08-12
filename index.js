const net = require('net');
const fetch = require('node-fetch');
const { v4: uuid } = require('uuid');

const config = require('./config.json');

let buffer = Buffer.alloc(0);

main();
async function main() {
  try {
    const client = await createDiscordConnection(config.client_id);
    const tokens = await authoriseClient(client, config, ['rpc.activities.write']);
    await authenticateClient(client, tokens);

    client.on('readable', $=> {
      const data = client.read();
      if (!data) return;
    
      buffer = Buffer.concat([buffer, data]);
    
      while (buffer.length >= 8) {
        const payloadLength = buffer.readUInt32LE(4);
        if (buffer.length < 8 + payloadLength) return;
    
        console.log('Received Data:');
        const payloadString = buffer.toString('utf8', 8, 8 + payloadLength);
        const payload = JSON.parse(payloadString);
        onDiscordEvent(payload);
    
        buffer = buffer.slice(8 + payloadLength);
      }
    });

    setDiscordActivity(client, config.baseActivity);
  }
  catch (err) {
    console.error(err);
  }
}

function onDiscordEvent(event) { 
  console.dir(event);
}



const OPCODES = {
  HANDSHAKE: 0,
  FRAME: 1,
  CLOSE: 2,
  PING: 3,
  PONG: 4,
};

/**
 * @returns {Promise<net.Socket>}
 */
function createDiscordConnection(client_id, ipcId = 0) {
  const basePath = '//?/pipe/discord-ipc-'.replaceAll('/', '\\');
  const client = net.createConnection(basePath + ipcId);

  return new Promise((res, rej) => {
    client.once('connect', async $=> {
      client.pause();
      client.removeAllListeners();
      client.ipcId = ipcId;

      console.log(`Connected to Discord ${client.ipcId}`);
      console.log('Shaking hands with Discord...');
      await handshake(client, client_id);
      res(client);
    });
    
    client.once('error', (err) => {
      if (ipcId + 1 < 10) createDiscordConnection(ipcId + 1).then(res, rej);
      else rej(err);
    });
  });
}

/**
 * @param {net.Socket} client
 * @returns {Promise<string>}
 */
function authoriseClient(client, {client_id, client_secret, redirect_uri}, scopes) {
  console.log('Authorizing...');
  sendDiscordCommand(client, {
    cmd: 'AUTHORIZE',
    nonce: uuid(),
    args: {
      client_id,
      scopes,
    },
  });

  return new Promise((res, rej) => {
    client.on('readable', onAuthorizeResponse);

    function onAuthorizeResponse() {
      const data = client.read();
      if (!data) return;
    
      buffer = Buffer.concat([buffer, data]);
    
      if (buffer.length >= 8) {
        const payloadLength = buffer.readUInt32LE(4);
        if (buffer.length < 8 + payloadLength) return;
    
        console.log('Authorization complete');
        const payloadString = buffer.toString('utf8', 8, 8 + payloadLength);
        const payload = JSON.parse(payloadString);
    
        buffer = buffer.slice(8 + payloadLength);
        client.removeListener('readable', onAuthorizeResponse);
        
        const {data: {code}} = payload;

        const method = 'POST';
        const url = 'https://discord.com/api/v8/oauth2/token';
        const body = new URLSearchParams({
          code,
          client_id,
          client_secret,
          grant_type: 'authorization_code',
          redirect_uri,
        });

        res(fetch(url, {method, body}).then(res => res.json()));
      }
    }
  });
}

/**
 * @param {net.Socket} client
 */
function authenticateClient(client, {access_token}) {
  console.log('Authenticating...');
  sendDiscordCommand(client, {
    cmd: 'AUTHENTICATE',
    nonce: uuid(),
    args: {
      access_token
    },
  });

  return new Promise((res, rej) => {
    client.on('readable', onAuthenticateResponse);

    function onAuthenticateResponse() {
      const data = client.read();
      if (!data) return;
    
      buffer = Buffer.concat([buffer, data]);
    
      if (buffer.length >= 8) {
        const payloadLength = buffer.readUInt32LE(4);
        if (buffer.length < 8 + payloadLength) return;
    
        console.log('Authentication complete');
        const payloadString = buffer.toString('utf8', 8, 8 + payloadLength);
        const payload = JSON.parse(payloadString);
    
        buffer = buffer.slice(8 + payloadLength);
        client.removeListener('readable', onAuthenticateResponse);
        res();
      }
    }
  });
}

/**
 * @param {net.Socket} client
 */
 function setDiscordActivity(client, activity) {
  console.log('Setting the Discord Activity...');
  sendDiscordCommand(client, {
    cmd: 'SET_ACTIVITY',
    nonce: uuid(),
    args: {
      pid: process.pid,
      activity,
    },
  });
}




function handshake(client, client_id) {
  const payloadString = JSON.stringify({ v: 1, client_id });
  const payloadLength = Buffer.byteLength(payloadString);

  const payloadBuffer = Buffer.alloc(8 + payloadLength);
  payloadBuffer.writeUInt32LE(OPCODES.HANDSHAKE, 0);
  payloadBuffer.writeUInt32LE(payloadLength, 4);
  payloadBuffer.write(payloadString, 8, payloadLength);
  
  client.write(payloadBuffer);

  return new Promise((res, rej) => {
    client.on('readable', onHandshakeResponse);

    function onHandshakeResponse() {
      const data = client.read();
      if (!data) return;
    
      buffer = Buffer.concat([buffer, data]);
    
      if (buffer.length >= 8) {
        const payloadLength = buffer.readUInt32LE(4);
        if (buffer.length < 8 + payloadLength) return;
    
        console.log('Handshake complete');
        const payloadString = buffer.toString('utf8', 8, 8 + payloadLength);
        const payload = JSON.parse(payloadString);
    
        buffer = buffer.slice(8 + payloadLength);
        client.removeListener('readable', onHandshakeResponse);
        res();
      }
    }
  });
}

/**
 * @param {net.Socket} client
 */
function sendDiscordCommand(client, payload) {
  const payloadString = JSON.stringify(payload);
  const payloadLength = Buffer.byteLength(payloadString);

  const payloadBuffer = Buffer.alloc(8 + payloadLength);
  payloadBuffer.writeUInt32LE(OPCODES.FRAME, 0);
  payloadBuffer.writeUInt32LE(payloadLength, 4);
  payloadBuffer.write(payloadString, 8, payloadLength);
  
  client.write(payloadBuffer);
}
