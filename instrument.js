const Sentry = require("@sentry/node");

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0, //supposed to be diff in production 
    dataCollection: {
        userInfo: false,
        httpBodies: []
    }
});

console.log('Sentry initialized with DSN:', process.env.SENTRY_DSN || "dsn-here");