//Sends the 6-digit email verification code.
//With GMAIL_USER and GMAIL_APP_PASSWORD set, the email goes out through Gmail SMTP (Nodemailer).
//Without them, local dev/test prints the code to the server console instead, and
//production refuses to send (so nobody is ever marked verified without a real email).
const nodemailer = require('nodemailer');

let transporter = null;
let transportLogged = false;

const gmailConfigured = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

//created once, on first use, then reused
const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            },
            //a hung SMTP connection must not hang signup
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
        });
    }
    return transporter;
};

//logs which transport is active, once (never any secrets)
const logTransportOnce = (name) => {
    if (transportLogged) return;
    transportLogged = true;
    console.log(`Email transport: ${name}`);
};

const sendVerificationCode = async ({ to, code, userId }) => {
    // 1. Real email when Gmail is configured
    if (gmailConfigured()) {
        logTransportOnce('gmail');
        try {
            await getTransporter().sendMail({
                //Gmail rewrites any From address that isn't the account itself
                from: { name: process.env.EMAIL_FROM_NAME || 'Dream Team', address: process.env.GMAIL_USER },
                to,
                subject: 'Your Dream-Team verification code',
                text: `Your Dream-Team verification code is ${code}. It expires in 10 minutes.\n\nIf you didn't sign up, you can ignore this email.`,
                html: `<p>Your Dream-Team verification code is:</p>`
                    + `<p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p>`
                    + `<p>It expires in 10 minutes. If you didn't sign up, you can ignore this email.</p>`
            });
        } catch (err) {
            //log the SMTP error's code/message only, never the verification code or the app password
            console.error('Gmail send error:', err.code, err.responseCode);
            throw new Error('Failed to send verification email');
        }
        return;
    }

    // 2. Production without Gmail configured: fail, don't fake it
    if (process.env.NODE_ENV === 'production') {
        console.error('Email sending is not configured: set GMAIL_USER and GMAIL_APP_PASSWORD');
        throw new Error('Failed to send verification email');
    }

    // 3. Local dev: print the code so signup works without an email provider
    logTransportOnce('console');
    console.log(`verification code for ${userId}: ${code}`);
};

module.exports = { sendVerificationCode };
