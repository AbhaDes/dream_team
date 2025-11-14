const { networkInterfaces } = require('os');
var message = 'CSC-317 node/express app \n'
         + 'This uses nodeJS, express, and express.static\n'
         + 'to \"serve\" the files in the ./public/ dir!\n';

const express = require('express');
const app = express();
app.use(express.json());
app.get('/api/test', async(req, res)=>{ //req - what comes in from the browser, res - what the browser sends back
    res.send('Server is running!');
});

const port = 3001;
// Add this line
const pool = require('./config/database');
console.log('Pool imported:', pool); // Should show Pool object

const path = require('path');
const StaticDirectory = path.join(__dirname, 'public');
app.use(express.static(StaticDirectory));

app.listen(port, () => {
    console.log(`Listening on http://127.0.0.1:${port}/`);
});

console.log(message);