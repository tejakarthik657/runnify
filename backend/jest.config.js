module.exports = {
    testEnvironment: 'node',
    testTimeout: 60000,
    setupFiles: ['dotenv/config'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup/testSetup.js'],
    verbose: true,
    forceExit: true,
};
