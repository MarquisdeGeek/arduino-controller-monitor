const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io').listen(server);

const arduino = require('arduino-controller');

/*
Use client example for digitizer example.

*/
server.listen(3000, function(){
  console.log('Express server listening...');
});

app.use('/', express.static('public'));

var five = require("johnny-five");
var board = new five.Board({});

board.on("ready", function() {
  var arduino_state = new arduino({controller: five, socketio: io});

  io.on('connect', function (socket) {
    console.log('We are connected!');
    arduino_state.onConnectAsHost(socket);
  });
});
