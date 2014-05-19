module.exports = function(app, cMongo, cRedis, conf, log) {

    var qs = require('querystring'),
        request = require('request'),
        async = require('async');

    // Log-in / Authentication
    app.use('/auth/isLoggedIn', isLoggedIn);
    app.use('/auth/login', login);
    app.use('/auth/providers/github/callback', githubAuthCallback);

    function isLoggedIn(req, res) {

        var sessionRedisKey = conf.redis.sessionPrefix + req.cookies[conf.sessionKey.cookie];

        cRedis.hexists(sessionRedisKey, 'userid', function(err, exists) {

            if (err) {
                log('Redis error', err);
                return res.send({
                    success: false,
                    error: 'Redis error'
                });
            }

            res.send({
                success: true,
                loggedIn: exists
            });

        });

    }

    function login(req, res) {

        var provider = req.body.provider;

        // generate state for oauth2:
        var state = require('crypto').randomBytes(conf.state.size).toString('hex');
        // save it in the client (to verify later):
        res.cookie(conf.state.cookie, state, {
            maxAge: conf.state.timeout,
            httpOnly: true,
            domain: conf.frontend.host
        });

        if (provider === 'github') {
            res.json({
                next: conf.github.gate + '?' + qs.stringify({
                    client_id: conf.github.clientId,
                    redirect_uri: 'http' + (conf.frontend.https ? 's' : '') + '://' + conf.frontend.host + ':' + conf.frontend.port + '/auth/providers/github/callback',
                    scope: conf.github.scope,
                    state: state
                })
            });
        }

    }

    function githubAuthCallback(req, res) {

        async.waterfall([
            verifyState,
            getAccessToken,
            getUserInfo,
            generateSessionKey,
            updateMongo,
            updateRedis,
            setSessionCookie
        ], function(err) {
            if (err) {
                res.json({
                    success: false,
                    error: err
                });
            } else {
                res.redirect('/');
                res.send();
            }
        });

        function verifyState(next) {

            var callbackState = req.query.state,
                cookieState = req.cookies[conf.state.cookie];

            res.clearCookie(conf.state.cookie);

            if (callbackState !== cookieState) {
                log('State cookie does not match \'state\' parameter', callbackState, cookieState);
                return next('State cookie does not match \'state\' parameter');
            }

            if (!req.query.code) {
                log('State cookie does not match \'state\' parameter', req.query.code);
                return next('Missing \'code\' parameter from Github callback');
            }

            next(null, req.query.code);

        }

        function getAccessToken(code, next) {

            //exchange code for permenant token

            var params = {
                url: conf.github.exchange,
                json: {
                    client_id: conf.github.clientId,
                    client_secret: conf.github.clientSecret,
                    code: code
                },
                headers: {
                    Accept: 'application/json'
                }
            };

            request.post(params, function(error, response, body) {

                if (error || response.statusCode !== 200) {
                    log('Cannot obtain access token from Github', error, response.statusCode, body);
                    return next('Cannot obtain access token from Github');
                }

                next(null, body);

            });

        }

        function getUserInfo(tokenDetails, next) {

            // get user info from github

            var params = {
                url: conf.github.getUser,
                headers: {
                    Authorization: 'token ' + tokenDetails.access_token,
                    'User-Agent': conf.github.userAgent
                }
            }

            request.get(params, function(error, response, body) {

                if (error || response.statusCode !== 200) {
                    log('Cannot obtain user info from Github', error, response.statusCode, body);
                    return next('Cannot obtain user info from Github');
                }

                var user = JSON.parse(body);
                user.access_token = tokenDetails.access_token;
                user.scope = tokenDetails.scope;
                user.token_type = tokenDetails.token_type;

                next(null, user);

            });

        }

        function generateSessionKey(user, next) {

            var sessionKey = require('crypto').randomBytes(conf.sessionKey.size).toString('hex');

            next(null, user, sessionKey);

        }

        function updateMongo(user, sessionKey, next) {

            // update user in mongo:

            cMongo.collection(conf.mongo.usersCollection).findAndModify({
                'github.id': user.id
            }, {}, {
                $set: {
                    github: user
                },
                $push: {
                    sessions: sessionKey
                }
            }, {
                new: true,
                upsert: true
            }, function(err, doc) {

                if (err) {
                    log('Mongo error', err);
                    return next('Mongo error');
                }

                next(null, sessionKey, doc._id);

            });

        }

        function updateRedis(sessionKey, userId, next) {

            // update session in redis

            var sessionRedisKey = conf.redis.sessionPrefix + sessionKey;

            cRedis.hmset(sessionRedisKey, {
                userid: userId,
                last: new Date().getTime()
            }, function(err) {

                if (err) {
                    log('Redis error', err);
                    next('Redis error');
                }

                next(null, sessionKey);

            });

        }

        function setSessionCookie(sessionKey, next) {

            res.cookie(conf.sessionKey.cookie, sessionKey, {
                maxAge: conf.sessionKey.clientMaxAge,
                httpOnly: true,
                domain: conf.frontend.host
            });

            next();

        }

    }

}