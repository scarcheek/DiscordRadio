import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';

Array.prototype.last = function() { return this[this.length - 1]; };

const require = (await import('module')).createRequire(import.meta.url);
const config = require('../config.json');

// http server for hosting the listener-client
const httpServer = express();
httpServer.use(express.static('public'));
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
  ws.send((listeners.get(host) ?? []).length);

  ws.on('message', playerState => {
    playerState = JSON.parse(playerState.toString());
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
