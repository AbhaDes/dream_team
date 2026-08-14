const Sentry = require("@sentry/node");

Sentry.init({
    dsn: "https://519e937babf451eac604b88615e5eb9a@o4511910598934528.ingest.us.sentry.io/4511910605488128", 
    tracesSampleRate: 1.0, //supposed to be diff in production 
});