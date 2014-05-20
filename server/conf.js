var conf = {

    // Frontend:
    frontend: {
        port: 8090,
        UIEndpoint: '/',
        static: '../ui/app',
        host: '127.0.0.1',
        protocol: 'http'
    },

    // Mongo:
    mongo: {
        url: 'mongodb://127.0.0.1:27017/twizio-dev',
        usersCollection: 'users',
        sessionsCollection: 'sessions'
    },

    //Redis:
    redis: {
        host: '127.0.0.1',
        port: '6379',
        db: 5,
        sessionPrefix: 'session:'
    },

    sessionKey: {
        cookie: 'twizioSessionKey',
        serverRefreshInterval: 2592000000, // 30 days
        clientMaxAge: 31536000000, // 1 year
        size: 20
    },

    // oauth2 state param:
    state: {
        cookie: 'twizioState',
        size: 20,
        timeout: 300000 // 5 minutes
    },

    // Github:
    github: {
        clientId: '--client-id--',
        clientSecret: '--client-secret--',
        gate: 'https://github.com/login/oauth/authorize',
        exchange: 'https://github.com/login/oauth/access_token',
        scope: '',
        getUser: 'https://api.github.com/user',
        userAgent: 'Twiz.io <eyalarubas@gmail.com>'
    }

}

// override with environment variables if:
// 1. TWIZIO_ENV_OVERRIDE is set
// or:
// 2. TWIZIO_ENV is set and not 'development'
var envOverride = !! process.env['TWIZIO_ENV_OVERRIDE'] || (process.env['TWIZIO_ENV'] && process.env['TWIZIO_ENV'] !== 'development');
if (envOverride) {
    Object.keys(conf).forEach(function(key) {
        Object.keys(conf[key]).forEach(function(subkey) {

            // corresponding environment variable:
            var eVar = ['TWIZIO', key, subkey].join('_').toUpperCase();

            // override if defined
            !! process.env[eVar] && (conf[key][subkey] = process.env[eVar]);

        });
    });
}

module.exports = conf;