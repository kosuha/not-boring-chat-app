const socket = io();

const form = document.querySelector('#form');
const input = document.querySelector('#input');
const leave = document.querySelector('#leave');
const messages = document.querySelector('#messages');
const inviteWindowWrap = document.querySelector('#inviteWindowWrap');
const closeInvite = document.querySelector('#close');
const friendList = document.querySelector('#friendList');

getUserData();
let members = getMemberList();
getFriendListData();

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
            invitePopUpEvent();
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
        invitePopUpEvent();
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
function invitePopUpEvent() {
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

async function getFriendListData() {
    let response = await fetch('/friend_list_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    let result = await response.json();

    if (result.length > 0) {
        for (let i = 0; i < result.length; i++) {
            const fragment = document.createDocumentFragment();

            const profilesTag = document.createElement('div');
            profilesTag.class = 'profiles';
            fragment.appendChild(profilesTag);

            const profilesImageTag = document.createElement('div');
            profilesImageTag.id = 'profilesImage';
            const img = document.createElement('img');
            profilesImageTag.appendChild(img);
            profilesTag.appendChild(profilesImageTag);

            const profilesChatNameTag = document.createElement('div');
            profilesChatNameTag.id = 'profilesChatName';
            profilesChatNameTag.textContent = result[i];
            profilesTag.appendChild(profilesChatNameTag);

            const profilesInviteTag = document.createElement('div');
            profilesInviteTag.class = 'profilesInvite';
            profilesInviteTag.textContent = 'invite';
            profilesInviteTag.addEventListener('click' || 'touchstart', () => {
                sendInviteChatName(result[i]);
                profilesInviteTag.style.display = 'none';
            });
            profilesTag.appendChild(profilesInviteTag);

            friendList.appendChild(fragment);
        }
    }
}

// 챗네임을 보내서 이미 채팅방 멤버인지 확인하고 아니라면 초대
async function sendInviteChatName(chatName) {
    let response = await fetch('/invite_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({ chatName: chatName })
    });

    let result = await response.json();
    console.log(result);
}

// 채팅방 멤버리스트 가져오기
async function getMemberList() {
    let response = await fetch('/get_member_list_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    let result = await response.json();
    console.log(result);
    return result;
}

// 초대 알림
// 방 리스트 실시간 업데이트
// 방 멤버 리스트
// 방 나가기
// 친구 추가
// 친구 삭제

