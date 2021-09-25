const ws = require('ws');
const ipcClient = require('./utils/ipc');

// Discord base rpc path
const { env: { XDG_RUNTIME_DIR, TMPDIR, TMP, TEMP } } = process;
const BASE_PATH = (process.platform === 'win32') 
  ? '//?/pipe/discord-ipc-'.replaceAll('/', '\\')
  : `${(XDG_RUNTIME_DIR || TMPDIR || TMP || TEMP || '/tmp').replace(/\/$/, '')}/discord-ipc-${id}`;

const wss = new ws.Server({ port: 6472 });
wss.on('connection', async (ws, req) => {
  const options = req.url.split('?')[1]
    .split('&')
    .reduce((obj, keyValPair) => {
      const [key, value] = keyValPair.split('=');
      obj[key] = value;
      return obj;
    }, {});


  const client = await connectDiscordIpcClient(options);
  client.onReceive(({payload}) => ws.send(JSON.stringify(payload)));
  client.handshake(options);

  ws.on('message', async (reqPayload) => {
    const data = JSON.parse(reqPayload.toString('utf8'));
    await client.sendFrame(data);
  });

  ws.on('close', $=> client.close());
});

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
