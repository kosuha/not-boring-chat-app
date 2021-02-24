const socket = io();

const form = document.querySelector('#form');
const input = document.querySelector('#input');
const leave = document.querySelector('#leave');
const messages = document.querySelector('#messages');
const inviteWindowWrap = document.querySelector('#inviteWindowWrap');
const closeInvite = document.querySelector('#close');

getUserData();

function socketIO(roomID, chatName) {
    socket.emit('joinRoom', roomID, chatName);

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (input.value) {
            socket.emit('chat message', roomID, chatName, input.value);
            let myMessage = makeInviteButton(input.value);
            const item = document.createElement('li');
            item.id = 'myMessages';
            item.insertAdjacentHTML('afterbegin', myMessage);
            messages.appendChild(item);
            window.scrollTo(0, document.body.scrollHeight);
            inviteEvent();
            input.value = '';
        }
    });

    leave.addEventListener('click' || 'touchStart', () => {
        socket.emit('leaveRoom', roomID, chatName);
        window.location.href = `/list`;
    });

    socket.on('chat message', (_chatName, _message) => {
        let replacedMessage = makeInviteButton(_message);
        const item = document.createElement('li');
        item.insertAdjacentHTML('afterbegin', `${_chatName}: ${replacedMessage}`);
        messages.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
        inviteEvent();
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

// 메시지에 @invite가 있으면 링크로 변환해서 반환
function makeInviteButton(inputmessage, tag) {
    const invite = '@invite'
    const inviteButton = '<a class="invite">@invite</a>';
    if (inputmessage.includes(invite)) {
        const regexp = new RegExp(invite, "gi");
        return inputmessage.replace(regexp, inviteButton);
    }
    return inputmessage;
}

// @invite를 누르면 팝업
function inviteEvent() {
    const inviteTag = document.getElementsByClassName('invite');
    for (let i = 0; i < inviteTag.length; i++) {
        inviteTag[i].addEventListener('click' || 'touchstart', () => {
            inviteWindowWrap.style.display = 'inline';
        });
    }
}

// 팝업 닫기
closeInvite.addEventListener('click' || 'touchstart', () => {
    inviteWindowWrap.style.display = 'none';
});
