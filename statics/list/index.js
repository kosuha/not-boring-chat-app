const roomList = document.querySelector('#roomList');
const friendList = document.querySelector('#friendList');

getListData();

//방 리스트 받아오기
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
async function sendRoomData(roomName) {
    let response = await fetch('/list_room_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({ room: roomName })
    });

    let result = await response.json();
    // console.log(result, typeof (result));
    if (result.result === true) {
        window.location.href = '/room';
    }
}

// 방 목록을 생성하는 템플릿
function roomListTemplate(roomName) {
    const div = document.createElement('div');
    div.textContent = roomName;
    roomList.appendChild(div);

    div.addEventListener('click', () => {
        sendRoomData(roomName)
    });
}

