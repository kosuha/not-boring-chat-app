const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.get('/nbca', (request, response) => {
    response.sendFile(__dirname + '/app/index.html');
});

app.get('/socket.io.js', (request, response) => {
    response.sendFile(__dirname + '/app/socket.io.js');
});

io.on('connection', (socket) => {
    io.emit('chat message', '입장!');
    socket.on('disconnect', () => {
        io.emit('chat message', '퇴장!');
    });
});

io.on('connection', (socket) => {
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
});

app.get('/style.css', (request, response) => {
    response.sendFile(__dirname + '/app/style.css');
});

http.listen(80, () => {
    console.log('listening on * : 80');
});