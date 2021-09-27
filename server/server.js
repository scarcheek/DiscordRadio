const fs = require('fs/promises');
const path = require('path');
const https = require('https');
const express = require('express');
const { WebSocketServer } = require('ws');

Array.prototype.last = function() { return this[this.length - 1]; };

const AUTH_URL = 'https://discordapp.com/api/oauth2/token';

const config = require('../config.json');
const secrets = require('./secrets.json');
let stats = {
  activitiesStarted: 0,
  listenAlongSessions: 0,
  trackedSongs: 0,
};

// stats loading and saving cron
try {
  stats = require('./stats.json');
}
catch (err) { /* ignore, no previous stats exist */ }

setInterval(() => {
  stats.lastSaveTimestamp = new Date().toLocaleString('at');
  fs.writeFile('./stats.json', JSON.stringify(stats, null, 2), 'utf8');
}, 15 * 60 * 1000)



// http server for hosting the listener-client
const httpServer = express();
httpServer.use(express.static('public'));
httpServer.use(express.json());
httpServer.use(cors);

httpServer.get('/stats', (req, res) => {
  res.status(200).json(stats);
});

httpServer.get('/auth', (req, res) => res.sendStatus(405));
httpServer.post('/auth', async (req, res) => {
  if (!req.body?.code && !req.body?.refresh_token) return res.status(401).json({ 
    err: 'Unauthorized, The request has not been applied because it lacks valid authentication credentials for the target resource.'
  });

  const tokens = (req.body.refresh_token) 
    ? await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 
          `grant_type=refresh_token&refresh_token=${req.body.refresh_token}` +
          `&client_id=${config.client_id}&client_secret=${secrets.client_secret}`
      }).then(res => res.json())
    : await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 
          `grant_type=authorization_code&code=${req.body.code}&redirect_uri=${config.redirect_uri}` +
          `&client_id=${config.client_id}&client_secret=${secrets.client_secret}`
      }).then(res => res.json());

  res.status(200).json(tokens);
});

httpServer.get('*', (req, res) => res.sendFile(path.resolve('public/listener-client.html')));
httpServer.listen(config.server_port, $ => console.log(`Yo he, donn hot da http surfer e schon gwunnen!`));


// the actual websocket server
const listeners = new Map();
const hosts = new Map();

const wsServer = new WebSocketServer({ port: 420 });
wsServer.on('connection', (ws) => {
  ws.once('message', (msg) => {
    const connUrl = msg.toString();
    const host = connUrl.split('/').last();

    if (connUrl.startsWith('host://')) connectHost(ws, host);
    else connectListener(ws, host);
  });
});

wsServer.on('listening', () => console.log(`Yo he, donn hot da websuckit surfer e schon gwunnen!`));


function connectHost(ws, host) {
  stats.activitiesStarted++;
  ws.send((listeners.get(host) ?? []).length);

  ws.on('message', msg => {
    const playerState = JSON.parse(msg.toString());
    
    if (!hosts.has(host) || playerState.URL !== hosts.get(host).playerState.URL) {
      stats.trackedSongs++;
    }

    hosts.set(host, { hostWs: ws, playerState });
    
    if (!listeners.has(host)) return;
    listeners.get(host).forEach(ws => ws.send(JSON.stringify(playerState)));
  });

  ws.on('close', () => {
    hosts.delete(host);
  });
}

function connectListener(ws, host) {
  if (!listeners.has(host)) {
    listeners.set(host, []);
  }

  listeners.get(host).push(ws);

  if (hosts.has(host)) {
    if (listeners.get(host).length === 1) {
      stats.listenAlongSessions++;
    }

    const { hostWs, playerState } = hosts.get(host);
    ws.send(JSON.stringify(playerState));
    hostWs.send(listeners.get(host).length);
  }

  ws.on('close', () => {
    const newListeners = listeners.get(host).filter(listener => listener !== ws);
    
    if (hosts.has(host)) {
      const { hostWs } = hosts.get(host);
      hostWs.send(newListeners.length);
    }

    if (newListeners.length === 0) listeners.delete(host);
    else listeners.set(host, newListeners);
  });
}



function fetch(url, options) {
  return new Promise((resolve, reject) => {
    const body = options.body;
    delete options.body;
  
    const req = https.request(url, options);
    req.write(body);
    req.end();
  
    req.on('response', res => {
      res.text =$=> new Promise((resolve, reject) => {
        res.body = '';
        res.on('data', data => res.body += data);
        res.on('end', $=> {
          resolve(res.body);
        });
      });

      res.json =$=> res.text().then(JSON.parse);
      resolve(res);
    });
  });
}

function cors(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTION') return res.send();
  else next();
}
