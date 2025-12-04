const { networkInterfaces } = require('os');
var message = 'CSC-317 node/express app \n'
         + 'This uses nodeJS, express, and express.static\n'
         + 'to \"serve\" the files in the ./public/ dir!\n';

var express = require('express');
var app = express();
var port = 3001;

const pool = require('./config/database');  
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const matchRoutes = require('./routes/matches');
var session = require('express-session');

var path = require('path');
// Add these BEFORE everything else
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Promise Rejection at:', promise);
    console.error('❌ Reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});
var StaticDirectory = path.join(__dirname, 'public');
app.use(express.static(StaticDirectory));
app.use(express.json());

app.use(session({
        secret: "I am the best in existence", 
        saveUninitialized : false,
        resave: false, 
        cookie: {
            maxAge: 3600000
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