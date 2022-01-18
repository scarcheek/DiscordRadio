const ws = require('ws');
const fs= require('fs/promises');
const ipcClient = require('./utils/ipc');
const port = require('../../config.json').gatewayPort;

const connections = new Map();

let apps = {};
try {
  apps = require('../apps.json');
}
catch (err) {
  // no existsing apps
}


// Discord base rpc path
const { env: { XDG_RUNTIME_DIR, TMPDIR, TMP, TEMP } } = process;
const BASE_PATH = (process.platform === 'win32') 
  ? '//?/pipe/discord-ipc-'.replaceAll('/', '\\')
  : `${(XDG_RUNTIME_DIR || TMPDIR || TMP || TEMP || '/tmp').replace(/\/$/, '')}/discord-ipc-`;



function start(appUI) {
  appUI.ipcMain.on('RESEND_APPS', () => {
    Object.values(apps).forEach(app => appUI.window.webContents.send('ADD_APP', app));
    appUI.window.webContents.send('TOGGLE_DISCORD_CONNECTION', { connected: (connections.size > 1 || healthCheckClient) ? true : false });
  });

  appUI.ipcMain.on('TOGGLE_ENABLE', async (event, app) => {
    apps[app.id] = app;
    await fs.writeFile('./apps.json', JSON.stringify(apps, null, 2));

    if (app.status === 'disabled' && connections.has(app.id)) {
      connections.get(app.id).close();
      connections.delete(app.id);
    }
  });

  appUI.ipcMain.on('REMOVE_APP', async (event, app) => {
    delete apps[app.id];
    await fs.writeFile('./apps.json', JSON.stringify(apps, null, 2));

    if (connections.has(app.id)) {
      connections.get(app.id).close();
      connections.delete(app.id);
    }
  });

  startHealthCheck(appUI);
  const wss = new ws.Server({ port });
  wss.on('connection', async (ws, req) => {
    const options = req.url.split('?')[1]
      .split('&')
      .reduce((obj, keyValPair) => {
        const [key, value] = keyValPair.split('=');
        obj[key] = value;
        return obj;
      }, {});
  
    try {
      const client = await connectDiscordIpcClient();
      client.on('close', () => ws.close());
      ws.on('close', () => {
        client.close();
        const appEntry = [...connections.entries()].find(([id, connection]) => connection === ws);
        
        if (appEntry) {
          const appId = appEntry[0];
          connections.delete(appId);

          if (connections.size === 0) startHealthCheck(appUI);
          
          appUI.window.webContents.send('TOGGLE_DISCORD_CONNECTION', { connected: true });
          appUI.window.webContents.send('TOGGLE_CONNECTION', apps[appId]);
        }
      });

      if (apps[options.client_id] && apps[options.client_id].status === 'disabled') {
        return ws.close();
      }

      client.handshake(options);
      client.onReceive(async ({payload}) => {
        if (payload.cmd === 'AUTHENTICATE' && payload.data?.application) {
          connections.set(payload.data.application.id, ws);

          if (!apps[payload.data.application.id]) { 
            const app = {
              id: payload.data.application.id,
              name: payload.data.application.name,
              summary: payload.data.application.summary,
              icon: `https://cdn.discordapp.com/app-icons/${payload.data.application.id}/${payload.data.application.icon}.png`,
              status: 'disabled',
            };
  
            apps[app.id] = app;
            await fs.writeFile('./apps.json', JSON.stringify(apps, null, 2));
            appUI.window.webContents.send('ADD_APP', app);
          }
          else {
            stopHealthCheck();
            appUI.window.webContents.send('TOGGLE_CONNECTION', { ...apps[payload.data.application.id], status: 'connected' });
          }

          if (apps[payload.data.application.id].status === 'disabled') {
            ws.send(JSON.stringify(payload));
            return ws.close();
          }
        }

        ws.send(JSON.stringify(payload));
      });

      ws.on('message', async (reqPayload) => {
        const data = JSON.parse(reqPayload.toString('utf8'));
        await client.sendFrame(data);
      });
    }
    catch (err) {
      console.log(err);
      ws.close();
    }
  });
}



let healthCheckClient = null;
let healthCheckTimeout;

async function startHealthCheck(appUI) {
  try {
    healthCheckClient = await connectDiscordIpcClient();
    healthCheckClient.on('close', () => {
      healthCheckClient = null;

      if (connections.size === 0) {
        startHealthCheck(appUI);
      } 
    });

    appUI.window.webContents.send('TOGGLE_DISCORD_CONNECTION', { connected: true });
  }
  catch (err) {
    healthCheckClient = null;
    appUI.window.webContents.send('TOGGLE_DISCORD_CONNECTION', { connected: false });
    healthCheckTimeout = setTimeout(() => startHealthCheck(appUI), 5000);
  }
}

function stopHealthCheck() {
  if (healthCheckTimeout) clearTimeout(healthCheckTimeout);
  if (healthCheckClient) healthCheckClient.close();
  healthCheckClient = null;
}

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

module.exports = {
  start,
};
