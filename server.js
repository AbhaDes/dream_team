const { networkInterfaces } = require('os');
var message = 'CSC-317 node/express app \n'
         + 'This uses nodeJS, express, and express.static\n'
         + 'to \"serve\" the files in the ./public/ dir!\n';

var express = require('express');
var app = express();
var port = 3001;

const pool = require('./config/database');  
const authRoutes = require('./routes/auth'); 

var session = require('express-session');

var path = require('path');
var StaticDirectory = path.join(__dirname, 'public');
app.use(express.static(StaticDirectory));
app.use(express.json());

app.use(session({
        secret: "I am the best in existence", 
        saveUninitialized : false,
        resave: false, 
        cookie: {
            maxAge: 36000
        }
    })
)

app.use(express.static('public'));

app.use('/api/auth', authRoutes);  

app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

app.listen(port, () => {
    console.log(`Listening on http://127.0.0.1:${port}/`);
});

console.log(message);
