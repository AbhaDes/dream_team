const app = require('./app');


var port = process.env.PORT || 3001;

const server = app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

server.on('error', (error) => {
  console.error('❌ Server failed to start:', error.message);
});