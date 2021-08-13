const net = require('net');
const fetch = require('node-fetch');
const { v4: uuid } = require('uuid');
const config = require('./config.json');
const http = require('http');

let buffer = Buffer.alloc(0);

main();
async function main() {
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

        const client = await createDiscordConnection(config.client_id);
        const tokens = await authoriseClient(client, config, ['rpc.activities.write']);
        await authenticateClient(client, tokens);

        const randomImageNr = Math.random();
        const large_image =
            (randomImageNr < 0.01) ? 'image-man' :
                (randomImageNr < 0.02) ? 'image-woman' :
                    (randomImageNr < 0.03) ? 'image-bear' :
                        'image';

        const server = http.createServer((req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "*");

            if (req.method === 'OPTIONS') return res.end();

            if (req.method === 'DELETE') {
                removeDiscordActivity(client);
                res.end();
                return
            }

            req.body = '';
            req.on('data', (chunk) => {
                req.body += chunk;
            });

            req.on('end', () => {
                try {
                    const data = JSON.parse(req.body);
                    const large_text = config.vibe_texts[Math.floor(Math.random() * config.vibe_texts.length)];
                    const activity = (data.paused)
                        ? {
                            details: data.title,
                            state: `via: ${data.channelName}`,
                            assets: {
                                large_image,
                                large_text,
                                small_image: 'pause-circle',
                                small_text: 'Paused',
                            },
                            buttons: [
                                { label: "🎧 Play on YouTube", url: data.URL }
                            ],
                        }
                        : {
                            details: data.title,
                            state: `via: ${data.channelName}`,
                            timestamps: {
                                start: Date.now() - 1000 * data.currTime
                            },
                            assets: {
                                large_image,
                                large_text,
                                small_image: 'play-circle',
                                small_text: 'Playing',
                            },
                            buttons: [
                                { label: "🎉 Listen Along", url: `${data.URL}&t=${data.currTime + 5}` },
                                { label: "🎧 Play on YouTube", url: data.URL }
                            ],
                        };

                    setDiscordActivity(client, activity);
                    res.end();
                } catch (er) {
                    res.statusCode = 400;
                    return res.end(`error: ${er.message}`);
                }
            });



        });

        server.listen(6969, () => {
            console.log('🎉 All set up and ready to go!\n📻 Listening for the browser extension.');
        });
    }
    catch (err) {
        console.error(err);
    }
}



const OPCODES = {
    HANDSHAKE: 0,
    FRAME: 1,
};

/**
 * @returns {Promise<net.Socket>}
 */
function createDiscordConnection(client_id, ipcId = 0) {
    const basePath = '//?/pipe/discord-ipc-'.replaceAll('/', '\\');
    const client = net.createConnection(basePath + ipcId);

    return new Promise((res, rej) => {
        client.once('connect', async $ => {
            client.pause();
            client.removeAllListeners();
            client.ipcId = ipcId;

            await handshake(client, client_id);
            res(client);
        });

        client.once('error', (err) => {
            if (ipcId + 1 < 10) createDiscordConnection(ipcId + 1).then(res, rej);
            else rej(err);
        });
    });
}

/**
 * @param {net.Socket} client
 * @returns {Promise<string>}
 */
function authoriseClient(client, { client_id, client_secret, redirect_uri }, scopes) {
    console.log('💳 Authorizing...');
    sendDiscordCommand(client, {
        cmd: 'AUTHORIZE',
        nonce: uuid(),
        args: {
            client_id,
            scopes,
        },
    });

    return new Promise((res, rej) => {
        client.on('readable', onAuthorizeResponse);

        function onAuthorizeResponse() {
            const data = client.read();
            if (!data) return;

            buffer = Buffer.concat([buffer, data]);

            if (buffer.length >= 8) {
                const payloadLength = buffer.readUInt32LE(4);
                if (buffer.length < 8 + payloadLength) return;

                const payloadString = buffer.toString('utf8', 8, 8 + payloadLength);
                const payload = JSON.parse(payloadString);

                buffer = buffer.slice(8 + payloadLength);
                client.removeListener('readable', onAuthorizeResponse);

                const { data: { code } } = payload;

                const method = 'POST';
                const url = 'https://discord.com/api/v8/oauth2/token';
                const body = new URLSearchParams({
                    code,
                    client_id,
                    client_secret,
                    grant_type: 'authorization_code',
                    redirect_uri,
                });

                res(fetch(url, { method, body }).then(res => res.json()));
            }
        }
    });
}

/**
 * @param {net.Socket} client
 */
function authenticateClient(client, { access_token }) {
    sendDiscordCommand(client, {
        cmd: 'AUTHENTICATE',
        nonce: uuid(),
        args: {
            access_token
        },
    });

    return new Promise((res, rej) => {
        client.on('readable', onAuthenticateResponse);

        function onAuthenticateResponse() {
            const data = client.read();
            if (!data) return;

            buffer = Buffer.concat([buffer, data]);

            if (buffer.length >= 8) {
                const payloadLength = buffer.readUInt32LE(4);
                if (buffer.length < 8 + payloadLength) return;

                buffer = buffer.slice(8 + payloadLength);
                client.removeListener('readable', onAuthenticateResponse);
                res();
            }
        }
    });
}

/**
 * @param {net.Socket} client
 */
function setDiscordActivity(client, activity) {
    sendDiscordCommand(client, {
        cmd: 'SET_ACTIVITY',
        nonce: uuid(),
        args: {
            pid: process.pid,
            activity,
        },
    });
}

/**
 * @param {net.Socket} client
 */
function removeDiscordActivity(client) {
    sendDiscordCommand(client, {
        cmd: 'SET_ACTIVITY',
        nonce: uuid(),
        args: {
            pid: process.pid,
        }
    });
}

/**
 * @param {net.Socket} client
 */
function handshake(client, client_id) {
    const payloadString = JSON.stringify({ v: 1, client_id });
    const payloadLength = Buffer.byteLength(payloadString);

    const payloadBuffer = Buffer.alloc(8 + payloadLength);
    payloadBuffer.writeUInt32LE(OPCODES.HANDSHAKE, 0);
    payloadBuffer.writeUInt32LE(payloadLength, 4);
    payloadBuffer.write(payloadString, 8, payloadLength);

    client.write(payloadBuffer);

    return new Promise((res, rej) => {
        client.on('readable', onHandshakeResponse);

        function onHandshakeResponse() {
            const data = client.read();
            if (!data) return;

            buffer = Buffer.concat([buffer, data]);

            if (buffer.length >= 8) {
                const payloadLength = buffer.readUInt32LE(4);
                if (buffer.length < 8 + payloadLength) return;

                buffer = buffer.slice(8 + payloadLength);
                client.removeListener('readable', onHandshakeResponse);
                res();
            }
        }
    });
}

/**
 * @param {net.Socket} client
 */
function sendDiscordCommand(client, payload) {
    const payloadString = JSON.stringify(payload);
    const payloadLength = Buffer.byteLength(payloadString);

    const payloadBuffer = Buffer.alloc(8 + payloadLength);
    payloadBuffer.writeUInt32LE(OPCODES.FRAME, 0);
    payloadBuffer.writeUInt32LE(payloadLength, 4);
    payloadBuffer.write(payloadString, 8, payloadLength);

    client.write(payloadBuffer);
}
