const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('app'));

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

http.listen(80, () => {
    console.log('listening on * : 80');
});