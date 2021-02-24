const roomList = document.querySelector('#roomList');
const friendList = document.querySelector('#friendList');
const generateRoomButton = document.querySelector('#generateRoomButton');
const generateRoomForm = document.querySelector('#generateRoomForm');
const roomNameInput = document.querySelector('#roomNameInput');
const roomNameSummit = document.querySelector('#roomNameSummit');
const alertMessage = document.querySelector('#alertMessage');

getUserData();
getListData();

// 세션의 유저 정보 받아오기
async function getUserData() {
    let response = await fetch('/user_data_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    let result = await response.json();
}

//방id 리스트 받아오기
async function getListData() {
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
    // console.log(result, typeof (result));
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
    return roomID.split(';')[0];
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
            alertMessage.textContent = `' ; ' 은 포함 될 수 없습니다!`;
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
    if (text.includes(';')) {
        return false;
    } else {
        return true;
    }
}

async function sendRoomNameData(roomName) {
    let response = await fetch('/room_generate_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({ roomName: roomName })
    });

    let result = await response.json();
    console.log(result);
    if (result.result === "success") {
        window.location.href = `/room`;
    }
}