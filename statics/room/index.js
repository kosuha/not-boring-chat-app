const socket = io();

const form = document.getElementById('form');
const input = document.getElementById('input');
const leave = document.getElementById('leave');
const messages = document.getElementById('messages');

getUserData();

function socketIO(roomID, chatName) {
    socket.emit('joinRoom', roomID, chatName);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (input.value) {
            socket.emit('chat message', roomID, chatName, input.value);

            const item = document.createElement('li');
            item.id = 'myMessages';
            item.textContent = `${input.value}`;
            messages.appendChild(item);
            window.scrollTo(0, document.body.scrollHeight);

            input.value = '';
        }
    });

    leave.addEventListener('click' || 'touchStart', () => {
        socket.emit('leaveRoom', roomID, chatName);
        window.location.href = `/list`;
    });

    socket.on('chat message', (_chatName, _message) => {
        const item = document.createElement('li');
        item.textContent = `${_chatName}: ${_message}`;
        messages.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    });
}


// 사용자 정보 받아오기(서버에서 셋팅)
async function getUserData() {
    let response = await fetch('/room_user_data_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    let result = await response.json();
    socketIO(result.room, result.chatName);
}