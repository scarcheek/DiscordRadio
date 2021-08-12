const config = require('./config.json');
const WebSocket = require('ws');

// start ma eine mitm createn vom websocket, des is als erstes dron, ge?

// itatier holt amol von 6463 bis 6472 weil discord sich nit so gonz sicha is welcher port frei is
const initialPort = 6463, maxPort = 6472;

let client;
try {
    client = getWebSocket(initialPort);
} catch (error) {
    console.error(error)
}

client.on('open', () =>
    client.send(JSON.stringify({
        nonce: "42069",
        args: {
            client_id: config.ClientID,
            scopes: ["rpc", "identify"]
        },
        cmd: "AUTHORIZE"
    }))
)

client.on('message', (data) => {
    console.log(`received data: ${data}`);
})

client.on('close', (data, lmao)=>console.log(`${data} ${lmao}`));

// FUNCTIONS oda so
/**
 * @return {WebSocket}
 */
function getWebSocket(port) {
    if (port > maxPort)
        throw new Error('Holts maul du host kan port gfundn, scheiße');
    try {
        return new WebSocket(`ws://127.0.0.1:${port}/?v=${config.version}&client_id=${config.ClientID}&encoding=${config.encoding}`)
    } catch (error) {
        return getWebSocket(port + 1);
    }
}