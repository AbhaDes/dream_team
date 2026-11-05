//Unit tests for utils/emailService -- no database needed.
jest.mock('nodemailer');

const ENV_KEYS = ['GMAIL_USER', 'GMAIL_APP_PASSWORD', 'EMAIL_FROM_NAME', 'NODE_ENV'];
const savedEnv = {};
const APP_PASSWORD = 'abcd efgh ijkl mnop';
const GMAIL = 'test-sender@example.test';

let sendMail;
let createTransport;

//load a fresh emailService (and a fresh nodemailer mock) under the current process.env
const loadService = () => {
    let service;
    jest.isolateModules(() => {
        const nodemailer = require('nodemailer');
        sendMail = jest.fn().mockResolvedValue({});
        createTransport = nodemailer.createTransport.mockReturnValue({ sendMail });
        service = require('../utils/emailService');
    });
    return service;
};

beforeEach(() => {
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
    for (const k of ENV_KEYS) delete process.env[k];
    process.env.NODE_ENV = 'test';
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    for (const k of ENV_KEYS) {
        if (savedEnv[k] === undefined) delete process.env[k];
        else process.env[k] = savedEnv[k];
    }
    jest.restoreAllMocks();
});

describe('emailService', () => {
    test('uses Gmail when GMAIL_* are set and sends from the Gmail address', async () => {
        process.env.GMAIL_USER = GMAIL;
        process.env.GMAIL_APP_PASSWORD = APP_PASSWORD;
        const { sendVerificationCode } = loadService();

        await sendVerificationCode({ to: 'new@user.test', code: '123456', userId: 1 });
        await sendVerificationCode({ to: 'new@user.test', code: '654321', userId: 1 });

        expect(createTransport).toHaveBeenCalledTimes(1); //transporter is reused
        expect(createTransport.mock.calls[0][0].auth).toEqual({ user: GMAIL, pass: APP_PASSWORD });
        expect(sendMail).toHaveBeenCalledTimes(2);
        const msg = sendMail.mock.calls[0][0];
        expect(msg.from).toEqual({ name: 'Dream Team', address: GMAIL });
        expect(msg.to).toBe('new@user.test');
        expect(msg.text).toContain('123456');
        expect(msg.html).toContain('123456');
    });

    test('EMAIL_FROM_NAME overrides the display name', async () => {
        process.env.GMAIL_USER = GMAIL;
        process.env.GMAIL_APP_PASSWORD = APP_PASSWORD;
        process.env.EMAIL_FROM_NAME = 'Custom Name';
        const { sendVerificationCode } = loadService();

        await sendVerificationCode({ to: 'a@b.test', code: '111111', userId: 1 });

        expect(sendMail.mock.calls[0][0].from).toEqual({ name: 'Custom Name', address: GMAIL });
    });

    test('a sendMail failure throws a generic error without the code or password', async () => {
        process.env.GMAIL_USER = GMAIL;
        process.env.GMAIL_APP_PASSWORD = APP_PASSWORD;
        const service = loadService();
        sendMail.mockRejectedValue(Object.assign(new Error(`Invalid login for ${APP_PASSWORD}`), { code: 'EAUTH', responseCode: 535 }));

        let thrown;
        try {
            await service.sendVerificationCode({ to: 'a@b.test', code: '987654', userId: 1 });
        } catch (e) {
            thrown = e;
        }

        expect(thrown).toBeDefined();
        expect(thrown.message).not.toContain('987654');
        expect(thrown.message).not.toContain(APP_PASSWORD);
        const logged = JSON.stringify(console.error.mock.calls);
        expect(logged).not.toContain('987654');
        expect(logged).not.toContain(APP_PASSWORD);
    });

    test('with nothing configured outside production it logs the code instead of sending', async () => {
        const { sendVerificationCode } = loadService();

        await sendVerificationCode({ to: 'a@b.test', code: '424242', userId: 7 });

        expect(createTransport).not.toHaveBeenCalled();
        expect(sendMail).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('verification code for 7: 424242');
    });

    test('in production with no Gmail config it throws', async () => {
        process.env.NODE_ENV = 'production';
        const { sendVerificationCode } = loadService();

        await expect(sendVerificationCode({ to: 'a@b.test', code: '424242', userId: 7 }))
            .rejects.toThrow('Failed to send verification email');
        expect(sendMail).not.toHaveBeenCalled();
    });
});
