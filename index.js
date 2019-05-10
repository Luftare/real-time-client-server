const ServerConnection = require('./server-connection');

const connection = new ServerConnection({});

setInterval(() => {
  connection.clients.forEach(client => {
    client.unreliablySend('stuff', 'Hello from the server!');
  });
}, 1000);

connection.on('client-connect', id => {
  console.log(id);
});

connection.on('client-stuff', (client, payload) => {
  console.log(client.id, payload);
});

connection.on('reliable-mirror', (client, payload) => {
  client.send('reliable-mirror', payload);
});

connection.on('unreliable-mirror', (client, payload) => {
  client.unreliablySend('unreliable-mirror', payload);
});
