// The global state of the host.
export default {
  discordConn: null,
  serverConn: null,
  extensionConn: null,
  currActivityData: null,
  nrOfListeners: 0,
  serverReconnectCount: 0,
  listenAlong: {
    host: null,
    startTime: null,
  }
};
