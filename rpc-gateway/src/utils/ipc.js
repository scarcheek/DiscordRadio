const net = require('net');

const OPCODES = {
  HANDSHAKE: 0,
  FRAME: 1,
  CLOSE: 2,
};


/**
 * A stateless IPC client which partially applies all the exported functions of this module.
 * @param {string} path The path to the IPC socket.
 * @return {IpcClient} An IPC client.
 */
async function createClient(path) {
  const socket = await connect(path);

  return {
    handshake: (payload) => handshake(socket, payload),
    sendFrame: (payload) => sendFrame(socket, payload),
    onReceive: (handler) => onReceive(socket, handler),
    close: () => socket.destroy(),
  };
};

/**
 * Connect to an IPC socket.
 * @param {string} path The path to the IPC socket.
 * @return {Promise<net.Socket>} A promise that resolves to a connected socket.
 */
function connect(path) {
  const socket = net.createConnection(path);
  return new Promise((res, rej) => {
    socket.once('connect', async $ => {
      // pause the socket to enable manual read mode
      socket.pause();
      socket._readBuffer = Buffer.alloc(0);

      socket.removeAllListeners();
      res(socket);
    });

    socket.once('error', (err) => {
      socket.removeAllListeners();
      socket.destroy();
      rej(err);
    });
  });
}

/**
 * Send a handshake message to the IPC socket and wait for a response.
 * @param {net.Socket} socket The socket to send the handshake to.
 * @param {string|Buffer} payload The payload to send.
 * @return {Promise<IpcMessage>} A promise that resolves to the received handshake response.
 */
function handshake(socket, payload) {
  send(socket, OPCODES.HANDSHAKE, payload);
}

/**
 * Send a frame to the IPC socket.
 * @param {net.Socket} socket The socket to send the frame to.
 * @param {string|Buffer} payload The payload to send.
 */
function sendFrame(socket, payload) {
  send(socket, OPCODES.FRAME, payload);
}

/**
 * Send a message to the IPC socket.
 * @param {net.Socket} socket The socket to send the message to.
 * @param {number} opcode The opcode of the message.
 * @param {string|Buffer} payload The payload to send.
 */
function send(socket, opcode, payload) {
  const payloadString = JSON.stringify(payload);
  const payloadLength = (payload) ? Buffer.byteLength(payloadString) : 0;
  const payloadBuffer = Buffer.alloc(8 + payloadLength);

  payloadBuffer.writeUInt32LE(opcode, 0);
  payloadBuffer.writeUInt32LE(payloadLength, 4);
  if (payload) {
    payloadBuffer.write(payloadString, 8, payloadLength); 
  }

  socket.write(payloadBuffer);
}

/**
 * Add an IPC event listener to the socket.
 * @param {net.Socket} socket The socket to listen for events on.
 * @param {(message: IpcMessage) => any} handler The handler to call when the event is emitted.
 */
function onReceive(socket, handler) {
  socket.on('readable', () => {
    const payloadBuffer = socket.read();
    if (!payloadBuffer) return;

    socket._readBuffer = Buffer.concat([socket._readBuffer, payloadBuffer]);
    while (socket._readBuffer.length >= 8) {
      const payloadLength = socket._readBuffer.readUInt32LE(4);
      if (socket._readBuffer.length < 8 + payloadLength) return;
  
      const opcode = socket._readBuffer.readUInt32LE(0);
      const payloadString = socket._readBuffer.toString('utf8', 8, 8 + payloadLength);
      const payload = JSON.parse(payloadString);
  
      socket._readBuffer = socket._readBuffer.slice(8 + payloadLength);
      handler({ opcode, payload });
    }
  });
}

module.exports = createClient;
module.exports.connect = connect;
module.exports.handshake = handshake;
module.exports.sendFrame = sendFrame;
module.exports.onReceive = onReceive;
