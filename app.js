require('dotenv').config();
const { networkInterfaces } = require('os');

var express = require('express');
var app = express();


const cors = require('cors');
// FRONTEND_URL lets production point at any domain without a code change;
// localhost is always allowed so local dev works against a deployed backend too.
// Vercel preview deployments use *.vercel.app URLs for testing
const allowedOrigins = [
    'http://localhost:3000',
    'https://dream-team-nine.vercel.app',
];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

// CORS configuration with regex support for Vercel previews
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g., mobile apps, curl requests)
        if (!origin) return callback(null, true);

        // Check exact matches
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Check if origin matches Vercel preview pattern (*.vercel.app)
        if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
            return callback(null, true);
        }

        // Origin not allowed
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
};

app.use(cors(corsOptions))

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

module.exports = app;