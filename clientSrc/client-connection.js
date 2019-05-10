const Peer = require('simple-peer');
const io = require('socket.io-client');

const EVENT_SOCKET_DISCONNECT = 'socket-disconnect';
const EVENT_MESSAGE = 'message';
const EVENT_CONNECT = 'connect';

module.exports = class ClientConnection {
  constructor() {
    this.socket = null;
    this.peer = null;
    this.topics = {};
  }

  on(key, callback) {
    this.topics[key] = this.topics[key] || [];
    this.topics[key].push(callback);
  }

  publish(key, ...args) {
    const callbacks = this.topics[key];

    if (callbacks)
      callbacks.forEach(callback => {
        callback(...args);
      });
  }

  bundleMessage(label, data) {
    return {
      l: label,
      p: data
    };
  }

  unreliablyEmit(label, data) {
    const message = this.bundleMessage(label, data);
    const json = JSON.stringify(message);

    this.peer.send(json);
  }

  reliablyEmit(label, data) {
    const message = this.bundleMessage(label, data);
    this.socket.emit('msg', message);
  }

  connect() {
    const socket = io();
    this.socket = socket;

    socket.on('connect', () => {
      let peer = new Peer({
        channelConfig: {
          reliable: false,
          ordered: false
        }
      });

      this.peer = peer;

      socket.on('msg', message => {
        this.publish(EVENT_MESSAGE, message);
      });

      socket.on('rtc-signal', data => {
        peer.signal(data);
      });

      peer.on('signal', data => {
        socket.emit('rtc-signal', data);
      });

      peer.on('connect', () => {
        socket.off('rtc-signal');
        this.publish(EVENT_CONNECT);
      });

      peer.on('data', rawData => {
        const json = rawData.toString();
        const data = JSON.parse(json);

        this.publish(EVENT_MESSAGE, data);
      });

      socket.emit('request-rtc');

      socket.on('disconnect', () => {
        this.publish(EVENT_SOCKET_DISCONNECT);
      });
    });
  }
};
