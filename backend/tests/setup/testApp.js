const { app, io, server } = require('../../api-gateway/index');

/**
 * Returns the app and io instances for testing.
 * Note: Redis and DB should be mocked before requiring this in tests
 * if you want to avoid real connections.
 */
module.exports = {
    app,
    io,
    server
};
