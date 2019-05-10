const ClientConnection = require('./client-connection');

const connection = new ClientConnection();

connection.on('connect', () => {
  console.log('connected!');
});

connection.connect();
