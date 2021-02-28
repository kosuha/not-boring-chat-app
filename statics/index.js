const socket = io();

const roomList = document.querySelector('#roomList');
const friendList = document.querySelector('#friendList');
const generateRoomButton = document.querySelector('#generateRoomButton');
const generateRoomForm = document.querySelector('#generateRoomForm');
const roomNameInput = document.querySelector('#roomNameInput');
const roomNameSummit = document.querySelector('#roomNameSummit');
const alertMessage = document.querySelector('#alertMessage');
const searchInput = document.querySelector('#searchInput');
const searchSummit = document.querySelector('#searchSummit');
const searchResult = document.querySelector('#searchResult');
const notiList = document.querySelector('#notiList');

const navs = document.getElementsByClassName('navs');
const taps = document.getElementsByClassName('taps');

let myEmail = '';
let friendsListByChatName = [];

getUserData();
tap();
getFriendsListData();
getRoomIdListData();
getNotiList();


function tap() {
    for (let i = 0; i < navs.length; i++) {
        navs[i].addEventListener(('click' || 'touchStart'), () => {
            sendTapDataToSession(`${i}`);
            for (let j = 0; j < taps.length; j++) {
                if (i === j) {
                    taps[j].style.display = 'inline';
                } else {
                    taps[j].style.display = 'none';
                }
            }
        });
    }
}

// 세션의 유저 정보 받아오기
async function getUserData() {
    let response = await fetch('/user_data_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    let result = await response.json();

    myEmail = result.googleEmail;

    // console.log('client: ', result.tap);
    if (result.tap === '0') {
        taps[0].style.display = 'inline';
        taps[1].style.display = 'none';
        taps[2].style.display = 'none';
        taps[3].style.display = 'none';
    } else if (result.tap === '1') {
        taps[0].style.display = 'none';
        taps[1].style.display = 'inline';
        taps[2].style.display = 'none';
        taps[3].style.display = 'none';
    } else if (result.tap === '2') {
        taps[0].style.display = 'none';
        taps[1].style.display = 'none';
        taps[2].style.display = 'inline';
        taps[3].style.display = 'none';
    } else if (result.tap === '3') {
        taps[0].style.display = 'none';
        taps[1].style.display = 'none';
        taps[2].style.display = 'none';
        taps[3].style.display = 'inline';
    } else {
        taps[0].style.display = 'inline';
        taps[1].style.display = 'none';
        taps[2].style.display = 'none';
        taps[3].style.display = 'none';
    }

    socket.emit("signIn", result);
}

async function sendTapDataToSession(i) {
    let response = await fetch('/session_tap_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({ tap: i })
    });

    let result = await response.json();
}

//방id 리스트 받아오기
async function getRoomIdListData() {
    let response = await fetch('/list_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    let result = await response.json();
    // console.log(result, typeof (result));

    for (let i = 0; i < result.room_list.length; i++) {
        roomListTemplate(result.room_list[i]);
    }
}

// 방 번호를 서버로 보내서 해당 유저의 방 번호가 유효한 것인지 확인하고 방으로 이동
async function sendRoomData(roomID) {
    let response = await fetch('/list_room_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({ room: roomID })
    });

    let result = await response.json();
    if (result.result === true) {
        window.location.href = `/room`;
    }
}

// 방 목록을 생성하는 템플릿
function roomListTemplate(roomID) {
    const div = document.createElement('div');
    div.textContent = parseRoomIdToName(roomID);
    roomList.appendChild(div);

    div.addEventListener('click' || 'touchStart', () => {
        sendRoomData(roomID)
    });
}

// 방 아이디에서 방 이름을 추출하는 함수
function parseRoomIdToName(roomID) {
    return roomID.split('/')[0];
}

// 방 생성하는 폼을 보여주는 이벤트
let generateRoomFormDisplay = false;
generateRoomButton.addEventListener(('click' || 'touchStart'), () => {
    if (!generateRoomFormDisplay) {
        generateRoomForm.style.display = 'inline';
        generateRoomFormDisplay = true;
    } else {
        generateRoomForm.style.display = 'none';
        generateRoomFormDisplay = false;
    }
});

// 방을 생성하는 이벤트
roomNameSummit.addEventListener(('click' || 'touchStart'), () => {
    if (emptyCheck(roomNameInput.value)) {
        if (semicolonCheck(roomNameInput.value)) {
            sendRoomNameData(roomNameInput.value);
            roomNameInput.value = '';
        } else {
            alertMessage.textContent = `' ; 또는 / ' 은 포함 될 수 없습니다!`;
        }
    } else {
        alertMessage.textContent = `방 이름이 비어있어요!`;
    }
});

function emptyCheck(text) {
    if (text === '') {
        return false;
    }

    let result = text.match(/\s/g);
    if (result != null) {
        if (result.length === text.length) {
            return false;
        }
    }

    return true;
}

function semicolonCheck(text) {
    if (text.includes(';') || text.includes('/')) {
        return false;
    } else {
        return true;
    }
}

// 방을 만들기 위해 방 이름을 서버에 전송
async function sendRoomNameData(roomName) {
    let response = await fetch('/room_generate_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({ roomName: roomName })
    });

    let result = await response.json();
    // console.log(result);
    if (result.result === "success") {
        window.location.href = `/room`;
    }
}

// 친구 목록 가져오기
async function getFriendsListData() {
    let response = await fetch('/friend_list_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    let result = await response.json();

    friendsListByChatName = result;

    while (friendList.firstChild) {
        friendList.removeChild(friendList.firstChild);
    }

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

            friendList.appendChild(fragment);
        }
    }
}

// 입력이 들어오면 검색
searchInput.addEventListener('input', () => {
    sendSearchInputData(searchInput.value);
});

// searchSummit.addEventListener('click' || 'touchStart', () => {
//     sendSearchInputData(searchInput.value);
// });

// 검색어를 보내서 결과 데이터를 받아서 화면에 출력
async function sendSearchInputData(inputText) {
    let response = await fetch('/search_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({ inputText: inputText })
    });

    let result = await response.json();
    console.log(myEmail, friendsListByChatName);

    while (searchResult.firstChild) {
        searchResult.removeChild(searchResult.firstChild);
    }

    if (result.length > 0) {
        for (let i = 0; i < result.length; i++) {
            const fragment = document.createDocumentFragment();

            const profilesTag = document.createElement('div');
            profilesTag.class = 'searchResultProfiles';
            fragment.appendChild(profilesTag);

            const profilesImageTag = document.createElement('div');
            profilesImageTag.id = 'searchResultProfilesImage';
            const img = document.createElement('img');
            profilesImageTag.appendChild(img);
            profilesTag.appendChild(profilesImageTag);

            const profilesChatNameTag = document.createElement('div');
            profilesChatNameTag.id = 'searchResultProfilesChatName';
            profilesChatNameTag.textContent = result[i].chat_name;
            profilesTag.appendChild(profilesChatNameTag);

            if (!friendsListByChatName.includes(result[i].chat_name) && myEmail !== result[i].email) {
                const sendAddFriendTag = document.createElement('div');
                sendAddFriendTag.id = 'sendAddFriend';
                sendAddFriendTag.textContent = '친구 요청';
                sendAddFriendTag.addEventListener('click' || 'touchstart', () => {
                    sendFriendAdd(result[i]);
                    sendAddFriendTag.textContent = '요청됨';
                });
                profilesTag.appendChild(sendAddFriendTag);
            }

            searchResult.appendChild(fragment);
        }
    }
}

// 친구요청 받기, 받은 요청으로 리스트 업데이트
socket.on('sendFriendAdd', (senderData) => {
    getNotiList();
});

// 친구요청 보내기
async function sendFriendAdd(receiverData) {
    let response = await fetch('/send_friend_request_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({ receiverData: receiverData })
    });

    let result = await response.json();
    if (result.result === "success") {
        socket.emit('sendFriendAdd', receiverData);
    }
}

// 알림 목록 가져오기
async function getNotiList() {
    let response = await fetch('/get_friend_request_list_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    let result = await response.json();
    console.log(result);

    for (let i = 0; i < result.length; i++) {
        friendRequestNoti(result[i]); // 알림 목록의 이메일로 챗네임을 가져옴
    }

}

// 알림에 뜨는 친구요청의 템플릿
function friendRequestNotiTemplate(senderEmail, senderChatName) {
    const fragment = document.createDocumentFragment();

    const friendRequest = document.createElement('div');
    const friendRequestText = document.createElement('div');
    const friendRequestOk = document.createElement('button');
    const friendRequestNo = document.createElement('button');

    friendRequest.id = 'friendRequest';
    friendRequestText.id = 'friendRequestText';
    friendRequestOk.id = 'friendRequestOk';
    friendRequestNo.id = 'friendRequestNo';

    friendRequestText.textContent = `${senderChatName}님의 친구 요청!`;
    friendRequestOk.textContent = '수락';
    friendRequestNo.textContent = '거절';

    friendRequest.appendChild(friendRequestText);
    friendRequest.appendChild(friendRequestOk);
    friendRequest.appendChild(friendRequestNo);
    fragment.appendChild(friendRequest);

    friendRequestOk.addEventListener('click' || 'touchstart', () => {
        addFriend(senderEmail);
        friendRequest.remove();
    });

    friendRequestNo.addEventListener('click' || 'touchstart', () => {
        deleteFriendRequest(senderEmail);
        friendRequest.remove();
    });

    notiList.appendChild(fragment);
}

// 알림 목록의 이메일로 챗네임을 가져오고 템플릿으로 화면에 출력
async function friendRequestNoti(senderEmail) {
    let response = await fetch('/get_friend_request_list_chat_name_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({ email: senderEmail })
    });

    let senderChatName = await response.json();

    friendRequestNotiTemplate(senderEmail, senderChatName);
}

async function addFriend(senderEmail) {
    let response = await fetch('/add_friend_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({ senderEmail: senderEmail })
    });

    getFriendsListData();
}

async function deleteFriendRequest(senderEmail) {
    let response = await fetch('/delete_friend_request_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({ senderEmail: senderEmail })
    });

    getFriendsListData();
}