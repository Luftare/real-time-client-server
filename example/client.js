const ClientConnection = require('../client-connection');

const connection = new ClientConnection();

let unreliableThen = Date.now();
let reliableThen = Date.now();

connection.on('connect', () => {
  setInterval(() => {
    unreliableThen = Date.now();
    reliableThen = Date.now();
    connection.unreliablySend('unreliable-mirror', unreliableThen);
    connection.send('reliable-mirror', reliableThen);
  }, 1000);
});

connection.on('unreliable-mirror', then => {
  const RTT = Date.now() - then;
  console.log(`Unreliable: ${RTT}`);
});

connection.on('reliable-mirror', then => {
  const RTT = Date.now() - then;
  console.log(`Reliable: ${RTT}`);
});
