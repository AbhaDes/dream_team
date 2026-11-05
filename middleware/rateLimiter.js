
const {rateLimit} = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15*60*1000, // 15 minutes in milliseconds
    limit: 5,
    skipSuccessfulRequests: true, 
    statusCode: 429,
    ipv6Subnet: 56,
    //Key on the account, not the IP: behind the Vercel proxy every user can share
    //one IP, so an IP key lets a few typos lock out the whole event. Per-email keys
    //still stop password guessing against an account.
    keyGenerator: (req) => typeof req.body?.email === 'string'
        ? `login:${req.body.email.trim().toLowerCase()}`
        : 'login:invalid',
    message: {error: 'Too many login attemps. Please try again later'}
});

const registerLimiter = rateLimit({
   windowMs: 60*60*1000, //an hour in milliseconds
   limit: 7,
   skipSuccessfulRequests: true, 
   statusCode: 429, 
   ipv6Subnet: 56,
   message: {error: 'Too many registration attemps. Please try again later'}
});

module.exports = {loginLimiter, registerLimiter};