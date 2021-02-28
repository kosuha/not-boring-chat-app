/*
TODO:
    방에 속한 멤버가 없으면 방 지우기
    방 탈퇴 기능
    
    프로필 보기
    친구 삭제 기능
*/


const express = require('express');
const app = express();
const http = require('http').Server(app);
const connection = require('./lib/conn.js');
const sessionStoreConn = require('./lib/sessionStoreConn.js');
const io = require('socket.io')(http);
const session = require('express-session');
const passport = require('passport');
const MySQLStore = require('express-mysql-session')(session);
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const googleCredentials = require('./config/google.json');
const sessionData = require('./config/session.json');
const bodyParser = require('body-parser');

app.use(express.static('statics'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 세션 검사
const authenticateUser = (request, response, next) => {
    if (request.isAuthenticated()) {
        const userData = request.session.passport.user;
        connection.query(`SELECT * FROM user_list WHERE email = '${userData.googleEmail}' and google_id = '${userData.googleID}'`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                } else if (Object.keys(rows).length >= 1) {
                    request.session.passport.user.chatName = rows[0].chat_name;
                    next();
                } else {
                    console.log('회원정보 없음!');
                    response.redirect('/signup');
                }
            });
    } else {
        response.status(301).redirect('/signin');
    }
};

sessionCheckAndSignIn();
route();
serverProcess();
socketIO();

function route() {
    app.get('/', authenticateUser, (request, response) => {
        request.session.passport.user.room = '';
        response.sendFile(__dirname + '/app/index.html');
    });

    app.get('/room', authenticateUser, (request, response) => {
        const userData = request.session.passport.user;
        response.sendFile(__dirname + '/app/room/index.html');
    });
}

function serverProcess() {
    // 현재 세션의 유저 정보를 반환
    app.post('/user_data_process', (request, response) => {
        const userData = request.session.passport.user;
        response.json(userData);
    });

    //  세션에 탭 정보를 저장
    app.post('/session_tap_process', (request, response) => {
        request.session.passport.user.tap = request.body.tap;
        const userData = request.session.passport.user;
        response.json(userData);
    });

    // 방 리스트를 반환
    app.post('/list_process', (request, response) => {
        const userData = request.session.passport.user;

        connection.query(`SELECT room_list, friend_list FROM user_list WHERE email = '${userData.googleEmail}' and google_id = '${userData.googleID}'`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                } else {
                    response.json(rows[0]);
                }
            });
    });

    app.post('/list_room_process', (request, response) => {
        const userData = request.session.passport.user;

        // 방 번호를 받아서 해당 유저의 방 목록에 있는지 확인하고 세션에 방 번호를 저장한 후 bool값으로 반환
        connection.query(`SELECT room_list FROM user_list WHERE email = '${userData.googleEmail}' and google_id = '${userData.googleID}'`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                } else {
                    if (rows[0].room_list.includes(request.body.room)) {
                        request.session.passport.user.room = request.body.room
                        response.json({ result: true });
                    } else {
                        response.json({ result: false });
                    }
                }
            });
    });

    app.post('/room_user_data_process', (request, response) => {
        const userData = request.session.passport.user;
        response.json(userData);
    });

    // 방을 생성하고 자신의 방 목록에 추가한 후 세션에 방 정보 저장
    app.post('/room_generate_process', (request, response) => {
        const userData = request.session.passport.user;
        console.log(request.body);

        let today = new Date();

        let hours = today.getHours(); // 시
        let minutes = today.getMinutes();  // 분
        let seconds = today.getSeconds();  // 초
        let milliseconds = today.getMilliseconds(); // 밀리초

        let now = `${hours}:${minutes}:${seconds}:${milliseconds}`;
        let roomID = `${request.body.roomName}/${userData.googleEmail}/${now}`; // 방 ID = 방이름;생성자의 이메일;생성시간

        connection.query(
            `INSERT INTO room_list(room_name,generator,room_id, member) VALUES(?, ?, ?, ?)`,
            [request.body.roomName, userData.googleEmail, roomID, `["${userData.googleEmail}"]`],
            (error, rows, fields) => {
                if (error) {
                    throw error;
                } else {
                    connection.query(
                        `UPDATE user_list SET room_list = JSON_ARRAY_INSERT(room_list, '$[0]', '${roomID}') WHERE email = '${userData.googleEmail}'`,
                        (error, rows, fields) => {
                            if (error) {
                                throw error;
                            } else {
                                request.session.passport.user.room = roomID;
                                response.json({ result: "success" });
                            }
                        });
                }
            });
    });

    // 친구 목록에서 이메일을 가져와서 이메일에 해당하는 친구의 챗네임을 리스트로 반환
    app.post('/friend_list_invite_process', (request, response) => {
        const userData = request.session.passport.user;

        connection.query(`SELECT friend_list FROM user_list WHERE email = '${userData.googleEmail}' and google_id = '${userData.googleID}'`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                } else {
                    let friendEmailListNotMember = [];
                    const friendEmailList = rows[0].friend_list;

                    connection.query(`SELECT member FROM room_list WHERE room_id = '${userData.room}'`,
                        (error, rows, fields) => {
                            if (error) {
                                console.log(error);
                            } else {
                                const memberList = rows[0].member;
                                for (let i = 0; i < friendEmailList.length; i++) {
                                    if (!memberList.includes(friendEmailList[i])) {
                                        friendEmailListNotMember.push(friendEmailList[i]);
                                    }
                                }
                                let result = [];
                                for (let i = 0; i < friendEmailListNotMember.length; i++) {
                                    connection.query(`SELECT chat_name FROM user_list WHERE email = '${friendEmailListNotMember[i]}'`,
                                        (error, rows, fields) => {
                                            if (error) {
                                                console.log(error);
                                            } else {
                                                result.push(rows[0].chat_name);
                                                if (result.length === friendEmailListNotMember.length) {
                                                    response.json(result);
                                                }
                                            }
                                        });
                                }
                            }
                        });
                }
            });
    });

    // 방 멤버가 아닌지 확인하고 초대하기
    app.post('/invite_process', (request, response) => {
        const userData = request.session.passport.user;
        const chatName = request.body.chatName;

        connection.query(`SELECT room_list, email FROM user_list WHERE chat_name = '${chatName}'`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                } else {
                    const chatNameRoomList = rows[0].room_list;
                    const chatNameEmail = rows[0].email;
                    if (!chatNameRoomList.includes(userData.room)) {
                        connection.query(
                            `UPDATE user_list SET room_list = JSON_ARRAY_INSERT(room_list, '$[0]', '${userData.room}') WHERE chat_name = '${chatName}'`,
                            (error, rows, fields) => {
                                if (error) {
                                    console.log(error);
                                } else {
                                    connection.query(
                                        `UPDATE room_list SET member = JSON_ARRAY_INSERT(member, '$[0]', '${chatNameEmail}') WHERE room_id = '${userData.room}'`,
                                        (error, rows, fields) => {
                                            if (error) {
                                                console.log(error);
                                            } else {
                                                response.json({ result: "success" });
                                            }
                                        });
                                }
                            });
                    }
                }
            });
    });

    // 방의 멤버리스트를 가져와서 챗네임리스트로 전달
    app.post('/get_member_list_process', (request, response) => {
        const userData = request.session.passport.user;

        connection.query(`SELECT member FROM room_list WHERE room_id = '${userData.room}'`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                } else {
                    let result = [];
                    const memberList = rows[0].member;
                    for (let i = 0; i < memberList.length; i++) {
                        connection.query(`SELECT chat_name FROM user_list WHERE email = '${memberList[i]}'`,
                            (error, rows, fields) => {
                                if (error) {
                                    console.log(error);
                                } else {
                                    result.push(rows[0].chat_name);
                                    if (result.length === memberList.length) {
                                        response.json(result);
                                    }
                                }
                            });
                    }
                }
            });
    });

    // 친구 목록을 가져와서 챗네임으로 전달
    app.post('/friend_list_process', (request, response) => {
        const userData = request.session.passport.user;

        connection.query(`SELECT friend_list FROM user_list WHERE email = '${userData.googleEmail}' and google_id = '${userData.googleID}'`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                } else {
                    const friendEmailList = rows[0].friend_list;
                    let result = [];
                    for (let i = 0; i < friendEmailList.length; i++) {
                        connection.query(`SELECT chat_name FROM user_list WHERE email = '${friendEmailList[i]}'`,
                            (error, rows, fields) => {
                                if (error) {
                                    console.log(error);
                                } else {
                                    result.push(rows[0].chat_name);
                                    if (result.length === friendEmailList.length) {
                                        response.json(result);
                                    }
                                }
                            });
                    }
                }
            });
    });

    // 검색 기능
    app.post('/search_process', (request, response) => {
        const userData = request.session.passport.user;
        const input = request.body.inputText
        connection.query(`SELECT * FROM user_list WHERE MATCH (name, chat_name, email) AGAINST ('${input}' IN NATURAL LANGUAGE MODE);`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                } else {
                    // 검색 결과에서 나를 제외하기
                    for (let i = 0; i < rows.length; i++) {
                        if (rows[i].chat_name === userData.chatName) {
                            rows.splice(i, 1);
                        }
                    }
                    response.json(rows);
                }
            });
    });

    // 친구 추가 메시지가 있는지 확인하고 없으면 친구 추가 보내기
    app.post('/send_friend_request_process', (request, response) => {
        const userData = request.session.passport.user;
        const receiverData = request.body.receiverData;
        console.log('userData: ', userData);
        console.log('receiverData: ', receiverData);

        connection.query(`SELECT friend_request FROM user_list WHERE email = '${receiverData.email}'`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                } else {
                    let receiverFriendRequest = rows[0].friend_request;
                    if (!receiverFriendRequest.includes(userData.googleEmail)) {
                        connection.query(
                            `UPDATE user_list SET friend_request = JSON_ARRAY_INSERT(friend_request, '$[0]', '${userData.googleEmail}') WHERE email = '${receiverData.email}'`,
                            (error, rows, fields) => {
                                if (error) {
                                    console.log(error);
                                } else {
                                    response.json({ result: "success" });
                                }
                            });
                    } else {
                        response.json({ result: "already" });
                    }
                }
            });
    });

    // 친구 추가 메시지 목록을 가져오기 (알림에 출력)
    app.post('/get_friend_request_list_process', (request, response) => {
        const userData = request.session.passport.user;

        connection.query(`SELECT friend_request FROM user_list WHERE email = '${userData.googleEmail}'`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                } else {
                    response.json(rows[0].friend_request);
                }
            });
    });

    // 친구요청을 보낸 사람의 이메일을 받아서 챗네임으로 반환
    app.post('/get_friend_request_list_chat_name_process', (request, response) => {
        const userData = request.session.passport.user;
        const friend_request_email = request.body.email;
        connection.query(`SELECT chat_name FROM user_list WHERE email = '${friend_request_email}'`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                } else {
                    response.json(rows[0].chat_name);
                }
            });
    });

    app.post('/add_friend_process', (request, response) => {
        const userData = request.session.passport.user;
        const senderEmail = request.body.senderEmail;

        // 내 목록에 추가
        connection.query(`SELECT friend_list FROM user_list WHERE email = '${userData.googleEmail}'`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                } else {
                    let friend_list = rows[0].friend_list;
                    if (!friend_list.includes(senderEmail)) {
                        connection.query(
                            `UPDATE user_list SET friend_list = JSON_ARRAY_INSERT(friend_list, '$[0]', '${senderEmail}') WHERE email = '${userData.googleEmail}'`,
                            (error, rows, fields) => {
                                if (error) {
                                    console.log(error);
                                } else {
                                    // 친구요청 리스트 업데이트
                                    connection.query(
                                        `UPDATE user_list SET friend_request = JSON_REMOVE(friend_request, JSON_UNQUOTE(JSON_SEARCH(friend_request, 'one', '${senderEmail}'))) WHERE email = '${userData.googleEmail}'`,
                                        (error, rows, fields) => {
                                            if (error) {
                                                console.log(error);
                                            }
                                        });
                                }
                            });
                    }
                }
            });

        // 상대 목록에 추가
        connection.query(`SELECT friend_list FROM user_list WHERE email = '${senderEmail}'`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                } else {
                    let friend_list = rows[0].friend_list;
                    if (!friend_list.includes(userData.googleEmail)) {
                        connection.query(
                            `UPDATE user_list SET friend_list = JSON_ARRAY_INSERT(friend_list, '$[0]', '${userData.googleEmail}') WHERE email = '${senderEmail}'`,
                            (error, rows, fields) => {
                                if (error) {
                                    console.log(error);
                                }
                            });
                    }
                }
            });
    });

    // 친구 요청 목록에서 제거
    app.post('/delete_friend_request_process', (request, response) => {
        const userData = request.session.passport.user;
        const senderEmail = request.body.senderEmail;
        // 친구요청 리스트 업데이트
        connection.query(
            `UPDATE user_list SET friend_request = JSON_REMOVE(friend_request, JSON_UNQUOTE(JSON_SEARCH(friend_request, 'one', '${senderEmail}'))) WHERE email = '${userData.googleEmail}'`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                }
            });
    });
}

function sessionCheckAndSignIn() {
    app.use(session({
        secret: sessionData.data.secret,
        resave: false,
        saveUninitialized: true,
        store: new MySQLStore(sessionStoreConn)
    }));

    // Passport setting 
    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser(function (user, done) {
        done(null, user);
    });
    passport.deserializeUser(function (user, done) {
        done(null, user);
    });

    passport.use(new GoogleStrategy({
        clientID: googleCredentials.web.client_id,
        clientSecret: googleCredentials.web.client_secret,
        callbackURL: "http://localhost/auth/google/callback"
    },
        function (accessToken, refreshToken, profile, done) {
            const googleEmail = profile.emails[0].value;
            const googleID = profile.id;
            const userName = profile.displayName

            let user = {
                userName: userName,
                googleID: googleID,
                googleEmail: googleEmail,
                room: "",
                tap: "0",
            };
            done(null, user);
        }
    ));

    app.get('/auth/google',
        passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login', 'email'] })
    );

    app.get('/auth/google/callback',
        passport.authenticate('google', { failureRedirect: '/signin' }),
        (request, response) => {
            response.redirect('/');
        }
    );

    app.get('/signin', (request, response) => {
        response.sendFile(__dirname + '/app/signin/index.html');
    });

    app.get('/signup', (request, response) => {
        if (request.isAuthenticated()) {
            const userData = request.session.passport.user;
            connection.query(`SELECT * FROM user_list WHERE email = '${userData.googleEmail}' and google_id = '${userData.googleID}'`,
                (error, rows, fields) => {
                    if (error) {
                        console.log(error);
                    } else if (Object.keys(rows).length >= 1) {
                        response.status(301).redirect('/');
                    } else {
                        response.sendFile(__dirname + '/app/signup/index.html');
                    }
                });
        } else {
            response.status(301).redirect('/signin');
        }
    });

    app.post('/signup_process', (request, response) => {
        const userData = request.session.passport.user;

        connection.query(`SELECT * FROM user_list WHERE email = '${userData.googleEmail}' and google_id = '${userData.googleID}'`,
            (error, rows, fields) => {
                if (error) {
                    console.log(error);
                } else if (Object.keys(rows).length >= 1) {
                    console.log('already joined!');
                } else {
                    connection.query(`SELECT * FROM user_list WHERE chat_name = '${request.body.chatName}'`,
                        (error, rows, fields) => {
                            if (error) {
                                console.log(error);
                            } else if (Object.keys(rows).length >= 1) {
                                response.json({ "result": "failed" })
                            } else {
                                connection.query(
                                    `INSERT INTO user_list(name, chat_name, email, google_id, room_list, friend_list, friend_request) VALUES(?,?,?,?,?,?,?)`,
                                    [userData.userName, request.body.chatName, userData.googleEmail, userData.googleID, "[]", "[]", "[]"],
                                    (error, rows, fields) => {
                                        if (error) {
                                            throw error;
                                        } else {
                                            request.session.passport.user.chatName = request.body.chatName;
                                            response.json({ "result": "success" })
                                        }
                                    });
                            }
                        });
                }
            });
    });
}

function socketIO() {
    let signInID = {};

    io.on('connection', (socket) => {
        socket.on("signIn", (data) => {
            signInID[data.googleEmail] = socket.id;
            socket.signInData = data;
            console.log("동시 접속자: ", Object.keys(signInID).length);
        });

        socket.on('joinRoom', (room, name) => {
            socket.join(room, () => {
                console.log('join!');
            });
        });

        socket.on('leaveRoom', (room, name) => {
            socket.leave(room, () => {
                console.log('leave!');
            });
        });

        socket.on('chat message', (roomNumber, chatName, message) => {
            socket.broadcast.to(roomNumber).emit('chat message', chatName, message);
        });

        socket.on('sendFriendAdd', (receiverData) => {
            io.to(signInID[receiverData.email]).emit('sendFriendAdd', socket.signInData);
        });

        socket.on('disconnect', (data) => {
            for (const key in signInID) {
                if (signInID[key] === socket.id) {
                    delete signInID[key];
                }
            }
            console.log("동시 접속자: ", Object.keys(signInID).length);
        });
    });
}

http.listen(80, () => {
    console.log('listening on * : 80');
});