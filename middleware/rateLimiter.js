const {rateLimit, ipKeyGenerator} = require('express-rate-limit');

//Normalized the same way the controller does, so "Foo@x.com" and "foo@x.com" share a bucket
const emailKey = (prefix) => (req) => typeof req.body?.email === 'string'
    ? `${prefix}:${req.body.email.trim().toLowerCase()}`
    : `${prefix}:invalid`;

//PER-IP LIMITS ARE DELIBERATELY LOOSE AND ENV-CONFIGURABLE.
//Behind the Vercel rewrite proxy, req.ip may be one shared proxy IP for every user,
//in which case a per-IP limit is really a global limit for the whole site. Until the
//real client IP is confirmed (see LOG_CLIENT_IP in MIGRATIONS.md) the defaults are
//generous; tighten them with these env vars once req.ip is known to be per-client:
//  RATE_LIMIT_LOGIN_PER_15MIN, RATE_LIMIT_REGISTER_PER_HOUR,
//  RATE_LIMIT_VERIFY_PER_15MIN, RATE_LIMIT_RESEND_PER_15MIN
//The per-EMAIL limits below stay strict: they protect single accounts and don't
//depend on the client IP at all.
const envLimit = (name, fallback) => {
    const value = Number.parseInt(process.env[name], 10);
    return Number.isInteger(value) && value > 0 ? value : fallback;
};

//Per-IP key (IPv6 addresses are grouped by /56 so one host can't rotate addresses)
const ipKey = (prefix) => (req) => `${prefix}:${ipKeyGenerator(req.ip)}`;

//Loose per-IP cap in front of the per-email one: stops one client spraying
//passwords across many accounts.
const loginIpLimiter = rateLimit({
    windowMs: 15*60*1000, // 15 minutes in milliseconds
    limit: envLimit('RATE_LIMIT_LOGIN_PER_15MIN', 500),
    statusCode: 429,
    keyGenerator: ipKey('login-ip'),
    message: {error: 'Too many login attemps. Please try again later'}
});

const loginLimiter = rateLimit({
    windowMs: 15*60*1000, // 15 minutes in milliseconds
    limit: 5,
    skipSuccessfulRequests: true,
    //403 = right password, email not verified yet -- not a guess, so don't count it
    requestWasSuccessful: (req, res) => res.statusCode < 400 || res.statusCode === 403,
    statusCode: 429,
    //Key on the account, not the IP: behind the Vercel proxy every user can share
    //one IP, so an IP key lets a few typos lock out the whole event. Per-email keys
    //still stop password guessing against an account.
    keyGenerator: emailKey('login'),
    message: {error: 'Too many login attemps. Please try again later'}
});

//Every signup sends an email now, so successful requests count too.
const registerLimiter = rateLimit({
   windowMs: 60*60*1000, //an hour in milliseconds
   limit: envLimit('RATE_LIMIT_REGISTER_PER_HOUR', 200),
   statusCode: 429,
   keyGenerator: ipKey('register'),
   message: {error: 'Too many registration attemps. Please try again later'}
});

//Code guessing is already capped at 5 tries per code; this stops one client
//cycling through many accounts.
const verifyLimiter = rateLimit({
    windowMs: 15*60*1000, // 15 minutes in milliseconds
    limit: envLimit('RATE_LIMIT_VERIFY_PER_15MIN', 300),
    statusCode: 429,
    keyGenerator: ipKey('verify'),
    message: {error: 'Too many verification attempts. Please try again later'}
});

const resendIpLimiter = rateLimit({
    windowMs: 15*60*1000, // 15 minutes in milliseconds
    limit: envLimit('RATE_LIMIT_RESEND_PER_15MIN', 200),
    statusCode: 429,
    keyGenerator: ipKey('resend-ip'),
    message: {error: 'Too many code requests. Please try again later'}
});

//Per-email limits answer the same whether or not the account exists, so they
//can't be used to find out which emails are registered.
const resendCooldownLimiter = rateLimit({
    windowMs: 60*1000, // one code per minute
    limit: 1,
    statusCode: 429,
    keyGenerator: emailKey('resend-cooldown'),
    message: {error: 'Please wait a minute before requesting another code'}
});

const resendHourlyLimiter = rateLimit({
    windowMs: 60*60*1000, //an hour in milliseconds
    limit: 5,
    statusCode: 429,
    keyGenerator: emailKey('resend-hourly'),
    message: {error: 'Too many code requests. Please try again later'}
});

module.exports = {
    loginIpLimiter,
    loginLimiter,
    registerLimiter,
    verifyLimiter,
    resendIpLimiter,
    resendCooldownLimiter,
    resendHourlyLimiter
};
