const ws = require('ws');
const fs= require('fs/promises');
const ipcClient = require('./utils/ipc');
const { app } = require('electron');

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
  Object.values(apps).forEach(app => appUI.window.webContents.send('ADD_APP', app));

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

  const wss = new ws.Server({ port: 6473 });
  wss.on('connection', async (ws, req) => {
    console.log('ws connected');
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
      ws.on('close', () => client.close());

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
