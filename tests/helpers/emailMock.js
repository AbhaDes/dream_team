//Stand-in for utils/emailService in tests: records each code instead of emailing it.
//Use it from a test file with
//    jest.mock('../utils/emailService', () => require('./helpers/emailMock'));
//(the path is relative to the test file).
const codes = new Map();   // email -> last code sent
const waiters = new Map(); // email -> resolvers waiting for the next code

const sendVerificationCode = jest.fn(async ({ to, code }) => {
    codes.set(to, code);
    for (const resolve of waiters.get(to) ?? []) resolve(code);
    waiters.delete(to);
});

//last code sent to this email (undefined if none)
const lastCodeFor = (email) => codes.get(email.trim().toLowerCase());

//resolves with the next code sent to this email -- for sends the API doesn't
//wait on (resend-code answers before the email goes out)
const nextCodeFor = (email, timeoutMs = 2000) => new Promise((resolve, reject) => {
    const key = email.trim().toLowerCase();
    const timer = setTimeout(() => reject(new Error(`no code sent to ${key}`)), timeoutMs);
    waiters.set(key, [...(waiters.get(key) ?? []), (code) => { clearTimeout(timer); resolve(code); }]);
});

module.exports = { sendVerificationCode, lastCodeFor, nextCodeFor };
