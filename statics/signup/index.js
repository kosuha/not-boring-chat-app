const enter = document.querySelector('#enter');
const chatName = document.querySelector('#chatName');
const message = document.querySelector('#message');

enter.addEventListener('click' || 'touchStart', () => {
    if (emptyCheck(chatName.value) &&
        lengthCheck(chatName.value) &&
        regexrCheck(chatName.value)) {
            sendChatName();
    } else {
        message.textContent = "Invalid chat name!";
    }
});

document.addEventListener('keyup', () => {
    if (emptyCheck(chatName.value) &&
        lengthCheck(chatName.value) &&
        regexrCheck(chatName.value)) {
            chatName.style.border = '1px solid rgba(255, 0, 0, 0)';
    } else {
        chatName.style.border = '1px solid red';
    }
});

async function sendChatName() {
    let data = {
        chatName: chatName.value
    };
    let response = await fetch('/signup_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(data)
    });

    let result = await response.json();
    console.log(result, typeof (result));
    if (result.result === "success") {
        window.location.href = `/`;
    } else {
        message.textContent = "This chat name already exists!";
    }
}

function emptyCheck(text) {
    if (text === '') {
        return false;
    }

    let result = text.match(/\s/g);
    if (result != null) {
        return false;
    }

    return true;
}

function lengthCheck(text) {
    if (text.length < 3) {
        return false;
    } else {
        return true;
    }
}

function regexrCheck(text) {
    const check_num = /[0-9]/; // 숫자 
    const check_eng = /[a-zA-Z]/; // 영문
    const check_spc = /[~!@#$%^&*();|<>?:{}]/; // 특수문자

    if ((check_num.test(text) || check_eng.test(text)) && !check_spc.test(text)) {
        return true;
    } else {
        return false;

    }
}