const express = require('express');
const app = express();
const http = require('http').Server(app);
const connection = require('./lib/conn.js');
const sessionStoreConnection = require('./lib/sessionStoreConn.js');
const io = require('socket.io')(http);
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const googleCredentials = require('./config/google.json');
const sessionData = require('./config/session.json');
let userNameInChat = '';

app.use(express.static('app'));

const authenticateUser = (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.status(301).redirect('/signin');
    }
};

const sessionStore = new MySQLStore(sessionStoreConnection);

app.use(session({
    secret: sessionData.data.secret,
    resave: false,
    saveUninitialized: true
    // store: sessionStore
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
        // console.log(profile.displayName, profile.id, profile.emails[0].value);
        const googleEmail = profile.emails[0].value;
        const googleID = profile.id;
        const userName = profile.displayName

        let user = {
            userName: profile.displayName,
            googleID: profile.id,
            googleEmail: profile.emails[0].value
        };
        userNameInChat = userName;
        done(null, user);
    }
));

app.get('/auth/google',
    passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/signin' }),
    (request, response) => {
        console.log('request.user?:', request.user);
        response.redirect('/');
    }
);

app.post('/passport', (request, response) => {
    response.json(request.session.passport);
});

function isJoined(name, email, google_id) {
    connection.query(`SELECT * FROM user_list WHERE email = '${email}' and google_id = '${google_id}'`,
        (error, rows, fields) => {
            if (error) {
                console.log(error);
            } else if (Object.keys(rows).length >= 1) {
                // 세션 부여
                console.log('로그인!');
            } else {
                // 닉네임 생성
                const chatName = 'kosuha';
                // 세션 부여
                console.log('회원정보 없음!');
                addUser(name, chatName, email, google_id);
            }
        });
}

function addUser(name, chat_name, email, google_id) {
    connection.query(
        `INSERT INTO user_list(name, chat_name, email, google_id) VALUES(?,?,?,?)`,
        [name, chat_name, email, google_id],
        (error, rows, fields) => {
            if (error) {
                throw error;
            } else {
                console.log('회원정보 생성완료!');
            }
        }
    );
}

io.on('connection', (socket) => {
    io.emit('chat message', `${userNameInChat} 입장!`);
    socket.on('disconnect', () => {
        io.emit('chat message', `${userNameInChat} 퇴장!`);
    });
});

io.on('connection', (socket) => {
    socket.on('chat message', (msg) => {
        io.emit('chat message', `${userNameInChat}: ${msg}`);
    });
});

http.listen(80, () => {
    console.log('listening on * : 80');
});