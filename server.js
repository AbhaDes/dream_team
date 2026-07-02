const { networkInterfaces } = require('os');

var message = 'CSC-317 node/express app \n'
         + 'This uses nodeJS, express, and express.static\n'
         + 'to \"serve\" the files in the ./public/ dir!\n';

var express = require('express');
var app = express();
var port = 3001;

const cors = require('cors');
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://dream-team-nine.vercel.app'
        : 'http://localhost:3000',
    credentials: true
}))

const pool = require('./config/database');  
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const matchRoutes = require('./routes/matches');
var session = require('express-session');

var path = require('path');
// Add these BEFORE everything else
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection at:', promise);
    console.error('Reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
var StaticDirectory = path.join(__dirname, 'public');
app.use(express.static(StaticDirectory));
app.use(express.json());

const pgSession = require('connect-pg-simple')(session)

app.use(session({
        store: new pgSession({
            pool: pool, 
            tableName: 'session'
        }),
        secret: process.env.SESSION_SECRET, 
        saveUninitialized : false,
        resave: false, 
        cookie: {
            maxAge: 3600000, 
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', 
            secure: process.env.NODE_ENV === 'production'
        }
    })
)

app.use(express.static('public'));
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/events', matchRoutes);


app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

app.listen(port, () => {
    console.log(`Listening on http://127.0.0.1:${port}/`);
});

console.log(message);