//Sends the 6-digit email verification code.
//With RESEND_API_KEY and EMAIL_FROM set, the email goes out through Resend.
//Without them, local dev/test prints the code to the server console instead, and
//production refuses to send (so nobody is ever marked verified without a real email).
const { Resend } = require('resend');

let resendClient = null;
const getResendClient = () => {
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
};

const sendVerificationCode = async ({ to, code, userId }) => {
    // 1. Real email when Resend is configured
    if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
        const { error } = await getResendClient().emails.send({
            from: process.env.EMAIL_FROM,
            to,
            subject: 'Your Dream-Team verification code',
            text: `Your Dream-Team verification code is ${code}. It expires in 10 minutes.\n\nIf you didn't sign up, you can ignore this email.`,
            html: `<p>Your Dream-Team verification code is:</p>`
                + `<p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p>`
                + `<p>It expires in 10 minutes. If you didn't sign up, you can ignore this email.</p>`
        });
        if (error) {
            //log Resend's error, never the code
            console.error('Resend error:', error.name, error.message);
            throw new Error('Failed to send verification email');
        }
        return;
    }

    // 2. Production without Resend configured: fail, don't fake it
    if (process.env.NODE_ENV === 'production') {
        console.error('Email sending is not configured: set RESEND_API_KEY and EMAIL_FROM');
        throw new Error('Failed to send verification email');
    }

    // 3. Local dev: print the code so signup works without an email provider
    console.log(`verification code for ${userId}: ${code}`);
};

module.exports = { sendVerificationCode };
