require('dotenv').config();
require('./instrument');
const Sentry = require("@sentry/node");
const { networkInterfaces } = require('os');

var express = require('express');
var app = express();



const cors = require('cors');
// FRONTEND_URL lets production point at any domain without a code change;
// localhost is always allowed so local dev works against a deployed backend too.
const allowedOrigins = [
    'http://localhost:3000',
    'https://dream-team-nine.vercel.app',
];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({
    origin: allowedOrigins,
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

app.set('trust proxy', 1);

const pgSession = require('connect-pg-simple')(session)



app.use(session({
        store: new pgSession({
            pool: pool,
            tableName: 'session',
            createTableIfMissing: true
        }),
        secret: process.env.SESSION_SECRET, 
        saveUninitialized : false,
        resave: false, 
        rolling: true,
        cookie: {
            maxAge: 3600000, 
            sameSite: process.env.NODE_ENV === 'production'?'none' : 'lax', 
            secure: process.env.NODE_ENV === 'production'
        }
    })
)

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/events', matchRoutes);


app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

Sentry.setupExpressErrorHandler(app);

module.exports = app;