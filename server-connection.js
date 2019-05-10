const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Peer = require('simple-peer');
const wrtc = require('wrtc');

const EVENT_CLIENT_DISCONNECT = 'client-disconnect';
const EVENT_CLIENT_CONNECT = 'client-connect';
const EVENT_CONNECT = 'connect';

class ClientConnection {
  constructor(socket, peer) {
    this.socket = socket;
    this.peer = peer;
    this.id = socket.id;
  }

  send(label, payload) {
    this.socket.emit('msg', [label, payload]);
  }

  unreliablySend(label, payload) {
    const encodedMessage = JSON.stringify([label, payload]);
    this.peer.send(encodedMessage);
  }

  disconnect() {
    this.socket.disconnect();
    this.peer.destroy();
  }
}

module.exports = class ServerConnection {
  constructor({ port = 8000, hostClient = true, clientPath = '/client' }) {
    const app = express();
    const expressHttp = http.Server(app);
    const io = socketIo(expressHttp, {
      pingTimeout: 2000,
      pingInterval: 2000,
      cookie: false
    });

    this.topics = {};
    this.clients = [];

    if (hostClient) {
      app.use('/', express.static(clientPath));
    }

    expressHttp.listen(port, () => {
      this.publish(EVENT_CONNECT);
    });

    io.on('connection', socket => {
      let peer;
      let client;

      socket.on('request-rtc', () => {
        peer = new Peer({
          initiator: true,
          wrtc,
          channelConfig: {
            reliable: false,
            ordered: false
          }
        });

        peer.on('signal', data => {
          socket.emit('rtc-signal', data);
        });

        peer.on('connect', () => {
          client = new ClientConnection(socket, peer);
          this.clients.push(client);

          socket.on('msg', ([label, payload]) => {
            this.publish(label, client, payload);
          });

          this.publish(EVENT_CLIENT_CONNECT, client.id);
        });

        peer.on('data', encodedData => {
          const [label, payload] = JSON.parse(encodedData.toString());
          this.publish(label, client, payload);
        });
      });

      socket.on('rtc-signal', data => {
        peer.signal(data);
      });

      socket.on('disconnect', () => {
        if (peer) peer.destroy();
        this.clients = this.clients.filter(c => c !== client);
        if (client) this.publish(EVENT_CLIENT_DISCONNECT, client.id);
      });
    });
  }

  publish(key, ...args) {
    if (this.topics[key]) {
      this.topics[key].forEach(callback => {
        callback(...args);
      });
    }
  }

  on(key, callback) {
    this.topics[key] = this.topics[key] || [];
    this.topics[key].push(callback);
  }
};
