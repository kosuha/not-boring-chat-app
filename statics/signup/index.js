const enter = document.querySelector('#enter');
const chatName = document.querySelector('#chatName');

enter.addEventListener('click', () => {
    sendChatName();
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
    // response.end();
}