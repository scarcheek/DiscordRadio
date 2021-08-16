import net from 'net';

/** @typedef {import('../../@types/infrastructure/ipc').IpcClient} IpcClient */
/** @typedef {import('../../@types/infrastructure/ipc').IpcMessage} IpcMessage */

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
export default async function(path) {
  const socket = await connect(path);

  return {
    handshake: (payload) => handshake(socket, payload),
    sendFrame: (payload) => sendFrame(socket, payload),
    sendAndReceiveFrame: (payload) => sendAndReceiveFrame(socket, payload),
    on: (event, handler) => on(socket, event, handler),
  };
};

/**
 * Connect to an IPC socket.
 * @param {string} path The path to the IPC socket.
 * @return {Promise<net.Socket>} A promise that resolves to a connected socket.
 */
export function connect(path) {
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
export function handshake(socket, payload) {
  send(socket, OPCODES.HANDSHAKE, payload);
  return receive(socket);
}

/**
 * Send a frame to the IPC socket.
 * @param {net.Socket} socket The socket to send the frame to.
 * @param {string|Buffer} payload The payload to send.
 */
export function sendFrame(socket, payload) {
  send(socket, OPCODES.FRAME, payload);
}

/**
 * Send a frame to the IPC socket and wait for a response.
 * @param {net.Socket} socket The socket to send the frame to.
 * @return {Promise<IpcMessage>} A promise that resolves to the received frame.
 */
export function sendAndReceiveFrame(socket, payload) {
  sendFrame(socket, payload);
  return receive(socket);
}

/**
 * Add an IPC event listener to the socket.
 * @param {net.Socket} socket The socket to listen for events on.
 * @param {'receive'} event The event to listen for.
 * @param {(message: IpcMessage) => any} handler The handler to call when the event is emitted.
 */
export function on(socket, event, handler) {
  if (event !== 'receive') return;

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
 * Wait for the next frame from the IPC socket.
 * @param {net.Socket} socket The socket to wait for a frame from.
 * @return {Promise<IpcMessage>} A promise that resolves to the received frame.
 */
function receive(socket) {
  return new Promise((res, rej) => {
    socket.on('readable', onReadable);
    socket.once('error', onError);

    function onReadable() {
      const payloadBuffer = socket.read();
      if (!payloadBuffer) return;

      socket._readBuffer = Buffer.concat([socket._readBuffer, payloadBuffer]);
      if (socket._readBuffer.length < 8) return;

      const payloadLength = socket._readBuffer.readUInt32LE(4);
      if (socket._readBuffer.length < 8 + payloadLength) return;

      const opcode = socket._readBuffer.readUInt32LE(0);
      const payloadString = socket._readBuffer.toString('utf8', 8, 8 + payloadLength);
      const payload = JSON.parse(payloadString);

      socket._readBuffer = socket._readBuffer.slice(8 + payloadLength);

      socket.removeListener('readable', onReadable);
      socket.removeListener('error', onError);
      res({ opcode, payload });
    }

    function onError(err) {
      socket.removeListener('readable', onReadable);
      socket.removeListener('error', onError);
      rej(err);
    }
  });
}
