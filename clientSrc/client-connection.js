const Peer = require('simple-peer');
const io = require('socket.io-client');

const EVENT_SOCKET_DISCONNECT = 'socket-disconnect';
const EVENT_CONNECT = 'connect';

module.exports = class ClientConnection {
  constructor() {
    this.socket = null;
    this.peer = null;
    this.topics = {};

    this.connect();
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

  unreliablySend(label, data) {
    const encodedMessage = JSON.stringify([label, data]);
    this.peer.send(encodedMessage);
  }

  send(label, data) {
    this.socket.emit('msg', [label, data]);
  }

  connect() {
    const socket = io();
    this.socket = socket;

    socket.on('connect', () => {
      let peer = new Peer({
        reliable: false,
        ordered: false,
        channelConfig: {
          reliable: false,
          ordered: false
        }
      });

      this.peer = peer;

      socket.on('msg', ([label, payload]) => {
        this.publish(label, payload);
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

      peer.on('data', encodedMessage => {
        const [label, payload] = JSON.parse(encodedMessage.toString());
        this.publish(label, payload);
      });

      socket.emit('request-rtc');

      socket.on('disconnect', () => {
        this.publish(EVENT_SOCKET_DISCONNECT);
      });
    });
  }
};
