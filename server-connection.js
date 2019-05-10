const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Peer = require('simple-peer');
const wrtc = require('wrtc');

const EVENT_CLIENT_DISCONNECT = 'client-disconnect';
const EVENT_MESSAGE = 'message';
const EVENT_CONNECT = 'connect';

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

    if (hostClient) {
      app.use('/', express.static(__dirname + clientPath));
    }

    expressHttp.listen(port, () => {
      this.publish(EVENT_CONNECT);
    });

    io.on('connection', socket => {
      let peer;

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

        peer.on('connect', () => {});

        peer.on('data', rawData => {
          const json = rawData.toString();
          const data = JSON.parse(json);
          this.publish(EVENT_MESSAGE, data);
        });

        socket.on('rtc-signal', data => {
          peer.signal(data);
        });
      });

      socket.on('disconnect', () => {
        if (peer) {
          peer.destroy();
          peer = null;
          this.publish(EVENT_CLIENT_DISCONNECT, socket.id);
        }
      });
    });
  }

  /*   unreliablyEmit(label, data) {
    const message = this.bundleMessage(label, data);
    const json = JSON.stringify(message);

    this.peer.send(json);
  }

  reliablyEmit(label, data) {
    const message = this.bundleMessage(label, data);
    this.socket.emit('msg', message);
  } */

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

  bundleData(label, data) {
    return {
      l: label,
      p: data
    };
  }
};
