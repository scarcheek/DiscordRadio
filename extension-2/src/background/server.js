class DiscordRadioServer {
  static URL = 'ws://discordradio.tk:420';

  conn;

  connect(user) {
    return new Promise((resolve, reject) => {
      this.conn = new WebSocket(DiscordRadioServer.URL);
      this.conn.addEventListener('error', reject);
      this.conn.addEventListener('open', () => {
        this.conn.send(`host://${user.username}#${user.discriminator}`);
        resolve(this);
      });
    });
  }

  sendActivityData(data) {
    console.log('Sending data to the server...');
    console.dir(data);
    this.conn.send(JSON.stringify(data));
  }

  on(event, callback) {
    if (event === 'message') {
      this.conn.addEventListener('message', msg => callback(parseInt(msg.data)));
    }
    else {
      this.conn.addEventListener(event, callback);
    }
  }

  close() {
    this.conn.close();
  }
}
