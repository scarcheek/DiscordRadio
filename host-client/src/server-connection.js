import WebSocket from 'ws';
import { updateActivity } from './activity.js';
import $ from './state.js';

let closed = false;

export default async function connectToServer(config) {
  $.serverConn = new WebSocket(`ws://${config.server_uri}:420`);

  $.serverConn.on('open', function open() {
    $.serverConn.send(`host://${config.user}`);
    $.serverConn.on('message', nrOfListeners => {
      $.nrOfListeners = parseInt(nrOfListeners);
      if ($.currentActivityData) updateActivity($.currentActivityData, config);
    });

    if (!closed) {
      $.serverReconnectCount = -1;
      console.log('🎉 All set up and ready to go!');
      console.log();
    } 
    else {
      $.serverReconnectCount = -1;
      console.log('🤖 Reconnected.');
      console.log();
    }
  });

  $.serverConn.on('error', async (e) => {
    if ($.serverReconnectCount === 3) {
      console.log('⚡ Connection to server failed, continuing without server connection.');
      if (!closed) $.serverConn = null;
      return;
    }

    $.serverReconnectCount++;
    console.log('💥 Connection to server failed, reconnecting in 15s...');
    await wait(15_000);
    connectToServer(config);
  })

  $.serverConn.on('close', async (e) => {
    if ($.serverReconnectCount === -1) {
      $.serverReconnectCount++;
      closed = true;
      console.log('🔌 Lost connection to server, reconnecting in 15s...');
      await wait(15_000);
      connectToServer(config);
    }
  })
};



function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
