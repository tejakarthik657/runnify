const request = require('supertest');
const { app } = require('./testApp');

/**
 * Register and login a test user
 */
module.exports.setupUser = async (userData) => {
    // Register
    const regRes = await request(app)
        .post('/auth/register')
        .send({
            password: 'Password123!',
            ...userData
        });

    if (regRes.status !== 201 && regRes.status !== 200) {
        // If it's 400 (already exists), we might want to continue to login
        // But let's log it
        if (regRes.status !== 400) {
            console.error('Registration failed:', regRes.status, regRes.body);
        }
    }

    // Login
    const loginRes = await request(app)
        .post('/auth/login')
        .send({
            email: userData.email,
            password: userData.password || 'Password123!'
        });

    if (!loginRes.body.user) {
        throw new Error(`Login failed for ${userData.email}: ${JSON.stringify(loginRes.body)}`);
    }

    return {
        user: loginRes.body.user,
        token: loginRes.body.accessToken,
        accessToken: loginRes.body.accessToken,
        userId: loginRes.body.user._id || loginRes.body.user.id
    };
};
