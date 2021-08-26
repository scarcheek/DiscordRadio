import process from 'process';
import connectToDiscord from './discord-connection.js';
import listenForExtension from './extension-connection.js';
import connectToServer from './server-connection.js';
import $ from './state.js';

const require = (await import('module')).createRequire(import.meta.url);
const config = require('../../config.json');

try {
  console.log('📻 Discord Radio 🎶');
  console.log('-------------------');
  console.log('Discord Rich Presence based on the YouTube video that has been selected.');
  console.log('1. ✨ Start this app and authorise it ✨');
  console.log('2. 🧩 Use the browser extension to select a video (by using the context menu ;))');
  console.log('   📝 If the page doesn\'t get tracked immediately, just refresh it with F5');
  console.log('3. 🕺 Vibe with friends and family! 💃');
  console.log();

  console.log('🔌 Connecting to Discord...');
  await connectToDiscord(config);
  await listenForExtension(config);
  
  console.log('🔌 Connecting to the Listen-Along Server...');
  connectToServer(config);

  process.on('SIGINT', () => {
    if ($.serverConn) $.serverConn.close();
    process.exit();
  });
}
catch (err) {
  console.error(err);
}



