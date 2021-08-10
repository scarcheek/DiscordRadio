const ScarRadioID = '874785464278736947';
const client = require('./client')(ScarRadioID);


const puppeteer = require('puppeteer');


(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.google.com');
    // other actions...
    await browser.close();
})();


client.updatePresence({
    state: 'Don\'t look please',
    details: '🐍',
    largeImageKey: 'radio',
    smallImageKey: 'radio',
    instance: true,
});