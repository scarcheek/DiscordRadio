import http from 'http';
import rpcClient from './rpc.js';
import { requestHandlerFor } from './server.js';

const require = (await import('module')).createRequire(import.meta.url);
const config = require('../../config.json');



try {
  console.log('📻 Discord Radio 🎶');
  console.log('-------------------');
  console.log('Discord Rich Presence based on the YouTube video that has been selected.');
  console.log('1. Start this app and authorise it');
  console.log('2. Use the browser extension to select a video (by using the context menu ;))');
  console.log('2.5 If the page doesn\'t get tracked immediately, just refresh it with F5');
  console.log('3. 🕺 Vibe with friends and family! 💃');
  console.log();
  console.log('🔌 Connecting to Discord...');

  const client = await rpcClient(config.client_id);
  console.log('💳 Authorizing...');
  await client.login(
    config.client_id, 
    config.client_secret, 
    ['rpc.activities.write'],
    config.redirect_uri,
  );

  config.large_image = pickRandomImage();
  const server = http.createServer( requestHandlerFor(client, config) );
  server.listen(6969, () => {
    console.log('🎉 All set up and ready to go!');
    console.log('📻 Listening for the browser extension.');
    console.log();
  });
}
catch (err) {
  console.error(err);
}



function pickRandomImage() {
  const randomImageNr = Math.random();
  return  (randomImageNr < 0.01) ? 'image-man' :
          (randomImageNr < 0.02) ? 'image-woman' :
          (randomImageNr < 0.03) ? 'image-bear' :
          'image';
}
