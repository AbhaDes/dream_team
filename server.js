const { networkInterfaces } = require('os');
var message = 'CSC-317 node/express app \n'
         + 'This uses nodeJS, express, and express.static\n'
         + 'to \"serve\" the files in the ./public/ dir!\n';

const express = require('express');
const pool = require('./config/database');  
const authRoutes = require('./routes/auth'); 

var session = require('express-session');

const app = express();

// Middleware
app.use(express.json());  

//session 
app.use(session({
    secret: "I am the best in existence", 
    saveUninitialized : false,
    resave: false, 
    cookie: {
        maxAge: 36000
    }})
)

app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);  


app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});