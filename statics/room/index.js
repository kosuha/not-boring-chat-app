const socket = io();

const form = document.getElementById('form');
const input = document.getElementById('input');
const leave = document.getElementById('leave');
const messages = document.getElementById('messages');

let roomNumber = '';
let chatName = '';

getUserData();
socket.emit('joinRoom', roomNumber, chatName);

// TODO: 비동기처리 문제해결필요.

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
        socket.emit('chat message', roomNumber, chatName, input.value);
        input.value = '';
    }
});

leave.addEventListener('click', () => {
    socket.emit('leaveRoom', roomNumber, chatName);
    window.location.href = `/list`;
});

socket.on('chat message', (_chatName, _message) => {
    const item = document.createElement('li');
    item.textContent = `${_chatName}: ${_message}`;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

socket.on('joinRoom', (_room, _chatName) => {
    const item = document.createElement('li');
    item.textContent = `${_chatName}님 입장!`;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

socket.on('leaveRoom', (_room, _chatName) => {
    const item = document.createElement('li');
    item.textContent = `${_chatName}님 퇴장!`;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

// 사용자 정보 받아오기(서버에서 셋팅)
async function getUserData() {
    let response = await fetch('/room_user_data_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    let result = await response.json();
    roomNumber = result.room;
    chatName = result.chatName;
}