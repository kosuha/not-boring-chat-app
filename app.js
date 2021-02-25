const express = require('express');
const app = express();
const http = require('http').Server(app);
const connection = require('./lib/conn.js');
const io = require('socket.io')(http);
const session = require('express-session');
const passport = require('passport');
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
        response.sendFile(__dirname + '/app/index.html');
    });

    app.get('/list', authenticateUser, (request, response) => {
        const userData = request.session.passport.user;
        request.session.passport.user.room = '';
        response.sendFile(__dirname + '/app/list/index.html');
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
    app.post('/friend_list_process', (request, response) => {
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



                    if (friendEmailList.length > 0) {



                    } else {
                        response.json(result);
                    }
                }
            });
    });

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

}

function sessionCheckAndSignIn() {
    app.use(session({
        secret: sessionData.data.secret,
        resave: false,
        saveUninitialized: true
    }))

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
                userName: profile.displayName,
                googleID: profile.id,
                googleEmail: profile.emails[0].value
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
                                    `INSERT INTO user_list(name, chat_name, email, google_id, room_list, friend_list) VALUES(?,?,?,?,?,?)`,
                                    [userData.userName, request.body.chatName, userData.googleEmail, userData.googleID, "[]", "[]"],
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
    io.on('connection', (socket) => {

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

    });
}

http.listen(80, () => {
    console.log('listening on * : 80');
});