import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';
const require = (await import('module')).createRequire(import.meta.url);
const config = require('../config.json');


const httpServer = express();
httpServer.use(express.static('public'));
httpServer.get('*', (req, res) => res.sendFile(path.resolve('public/index.html')));

httpServer.listen(config.server_port, $ => console.log(`Yo he, donn hot da http surfer e schon gwunnen!`));


const listeners = new Map();
const hosts = new Map();

const wsServer = new WebSocketServer({ port: 420 });
wsServer.on('connection', (ws) => {
  ws.once('message', (msg) => {
    const connUrl = msg.toString();

    if (connUrl.startsWith('host://')) connectHost(ws, connUrl);
    else connectListener(ws, connUrl);
  });
});

wsServer.on('listening', $ => console.log(`Yo he, donn hot da websuckit surfer e schon gwunnen!`));


function connectHost(ws, connectionUrl) {
  const host = connectionUrl.replace('host://', '');
  ws.send((listeners.get(host) ?? []).length);

  ws.on('message', playerState => {
    playerState = JSON.parse(playerState.toString());
    
    hosts.set(host, { hostWs: ws, playerState });

    if (!listeners.has(host)) return;
    listeners.get(host).forEach(ws => ws.send(JSON.stringify(playerState)));
  });

  ws.on('close', $ => {
    hosts.delete(host);
  });
}

function connectListener(ws, connectionUrl) {
  const host = connectionUrl.split('/')[connectionUrl.split('/').length-1];

  if (!listeners.has(host)) {
    listeners.set(host, []);
  }

  listeners.get(host).push(ws);

  if (hosts.has(host)) {
    const { hostWs, playerState } = hosts.get(host);
    ws.send(JSON.stringify(playerState));
    hostWs.send(listeners.get(host).length);
  }

  ws.on('close', $ => {
    const newListeners = listeners.get(host).filter(listener => listener !== ws);
    if (hosts.has(host)) {
      const { hostWs } = hosts.get(host);
      hostWs.send(newListeners.length);
    }
    if (newListeners.length === 0) listeners.delete(host);
    else listeners.set(host, newListeners);
  });
}
