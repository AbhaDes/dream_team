
const {rateLimit} = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15*60*1000, // 15 minutes in milliseconds
    limit: 5,
    skipSuccessfulRequests: true, 
    statusCode: 429,
    ipv6Subnet: 56,
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