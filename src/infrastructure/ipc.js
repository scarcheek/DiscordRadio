const net = require('net');

const OPCODES = {
  HANDSHAKE: 0,
  FRAME: 1,
  CLOSE: 2,
};

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

function sendFrame(socket, payload) {
  send(socket, OPCODES.FRAME, payload);
}

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

function handshake(socket, payload) {
  send(socket, OPCODES.HANDSHAKE, payload);
  return receive(socket);
}

function sendAndReceiveFrame(socket, payload) {
  sendFrame(socket, payload);
  return receive(socket);
}


function on(socket, event, handler) {
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



module.exports = async function(path) {
  const socket = await connect(path);

  return {
    send: (opcode, payload) => send(socket, opcode, payload),
    sendFrame: (payload) => sendFrame(socket, payload),
    receive: () => receive(socket),
    handshake: (payload) => handshake(socket, payload),
    sendAndReceiveFrame: (payload) => sendAndReceiveFrame(socket, payload),
    on: (event, handler) => on(socket, event, handler),
  };
};

module.exports.connect = connect;
module.exports.sendFrame = sendFrame;
module.exports.receive = receive;
module.exports.handshake = handshake;
module.exports.sendAndReceiveFrame = sendAndReceiveFrame;
module.exports.on = on;
