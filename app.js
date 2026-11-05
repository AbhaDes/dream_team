require('dotenv').config();

var express = require('express');
var app = express();

//fail fast: without a secret, express-session would sign cookies with nothing
if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set. Add it to .env (or the host environment variables) before starting the server.');
}

const cors = require('cors');
// FRONTEND_URL lets production point at any domain without a code change;
// localhost is always allowed so local dev works against a deployed backend too.
// The browser normally never makes a cross-origin call to this API: the Next.js
// frontend calls relative /api/* URLs and a Next rewrite proxies them here, so
// requests are same-origin from the browser's point of view. CORS only matters
// for direct calls (e.g. local dev against a deployed backend), so the list is
// kept to exact origins -- no wildcard for *.vercel.app, since anyone can
// deploy to that domain.
const allowedOrigins = [
    'http://localhost:3000',
    'https://dream-team-nine.vercel.app',
];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

// CORS configuration (exact-match origins only)
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g., mobile apps, curl requests)
        if (!origin) return callback(null, true);

        // Check exact matches
        if (allowedOrigins.includes(origin)) {
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

//after an uncaught exception the process may be in a broken state, so log it and
//exit; Render restarts the process automatically
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
var StaticDirectory = path.join(__dirname, 'public');
app.use(express.static(StaticDirectory));
app.use(express.json());

app.set('trust proxy', 1);

//TEMPORARY: one-off check of which client IP the API sees (used by rate limiting).
//Set LOG_CLIENT_IP=true on Render, log in once, read the "[client-ip]" log line,
//then remove the env var (and this block). With 'trust proxy' = 1, req.ip is the
//right-most x-forwarded-for entry, i.e. the address of whoever connected to Render.
//Because the browser reaches the API through the Next rewrite on Vercel, that is
//likely Vercel's server, not the student -- if so, every student shares one IP
//for rate limiting and the limiter needs a different key.
//Remove this block and the env var once the client-IP check is done.
if (process.env.LOG_CLIENT_IP === 'true') {
    app.use('/api/auth/login', (req, res, next) => {
        console.log(`[client-ip] req.ip=${req.ip} x-forwarded-for=${req.headers['x-forwarded-for']}`);
        next();
    });
}

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
            //the cookie is set on responses to same-origin /api/* calls (Next rewrite),
            //so it is first-party and 'lax' works everywhere; 'none' is not needed
            sameSite: 'lax', 
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