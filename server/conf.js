module.exports = {

	// Frontend:
	frontend: {
		port: 8090,
		UIEndpoint: '/',
		static: '../ui/app',
		host: '127.0.0.1',
		https: false
	},

	// Mongo:
	mongo: {
		url: 'mongodb://127.0.0.1:27017/twizio-development',
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
		clientId: '139e3f6129c63b238675',
		clientSecret: 'c1688efb6ab47f48cb1878df3c55ad841666499f',
		gate: 'https://github.com/login/oauth/authorize',
		exchange: 'https://github.com/login/oauth/access_token',
		scope: '',
		getUser: 'https://api.github.com/user',
		userAgent: 'Twiz.io <eyalarubas@gmail.com>'
	}
}