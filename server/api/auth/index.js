module.exports = function(app, cMongo, cRedis, conf, log) {

    var qs = require('querystring'),
        async = require('async'),
        ObjectID = require('mongodb').ObjectID;

    var githubAuthCallback = require('./callbacks/github')(cMongo, cRedis, conf, log),
        googleAuthCallback = require('./callbacks/google')(cMongo, cRedis, conf, log);

    // Log-in / Authentication routes:
    app.use('/auth/isLoggedIn', isLoggedIn);
    app.use('/auth/login', login);
    app.use('/auth/logout', logout);
    app.use('/auth/providers/github/callback', githubAuthCallback);
    app.use('/auth/providers/google/callback', googleAuthCallback);

    // Handlers:
    // ---------

    function isLoggedIn(req, res) {

        var sessionRedisKey = conf.redis.sessionPrefix + req.cookies[conf.sessionKey.cookie];

        cRedis.hget(sessionRedisKey, 'last', function(err, last) {

            if (err) {
                log('Redis error. %s', err);
                return res.send({
                    success: false,
                    error: 'Redis error'
                });
            }

            if (!last) {
                return res.send({
                    success: true,
                    loggedIn: false,
                    reason: 'Session key does not exist on server'
                });
            }

            var now = new Date().getTime();

            if (now - last > conf.sessionKey.serverRefreshInterval) {
                return res.send({
                    success: true,
                    loggedIn: false,
                    reason: 'Session key expired'
                });
            }

            cRedis.hset(sessionRedisKey, 'last', now, function(err) {

                if (err) {
                    log('Redis error. %s', err);
                    return res.send({
                        success: false,
                        error: 'Redis error'
                    });
                }

                res.send({
                    success: true,
                    loggedIn: true
                });

            });

        });

    }

    function logout(req, res) {

        var sessionKey = req.cookies[conf.sessionKey.cookie];
        var sessionRedisKey = conf.redis.sessionPrefix + sessionKey;

        async.waterfall([
            getUserId,
            destroySession
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

        function getUserId(next) {

            cRedis.hget(sessionRedisKey, 'userid', function(err, userId) {

                if (err) {
                    log('Redis error. %s', err);
                    return next('Redis error');
                }

                next(null, userId);

            });

        }

        function destroySession(userId, next) {

            async.parallel([
                delRedis,
                updateMongoUser,
                delMongoSession,
                clearSessionCookie
            ], next);

            function delRedis(next) {

                cRedis.del(sessionRedisKey, function(err) {

                    if (err) {
                        log('Redis error. %s', err);
                        return next('Redis error');
                    }

                    next();

                });

            }

            function updateMongoUser(next) {

                cMongo.collection(conf.mongo.usersCollection).update({
                    _id: ObjectID(userId)
                }, {
                    $pullAll: {
                        sessions: [
                            ObjectID(sessionKey)
                        ]
                    }
                }, function(err) {

                    if (err) {
                        log('Mongo error. %s', err);
                        return next('Mongo error');
                    }

                    next();

                });

            }

            function delMongoSession(next) {

                cMongo.collection(conf.mongo.sessionsCollection).remove({
                    _id: ObjectID(sessionKey)
                }, function(err) {

                    if (err) {
                        log('Mongo error. %s', err);
                        return next('Mongo error');
                    }

                    next();

                });

            }

            function clearSessionCookie(next) {

                res.clearCookie(conf.sessionKey.cookie);
                next();

            }

        }

    }

    function login(req, res) {

        var provider = req.body.provider;

        // generate state for oauth2:
        var state = require('crypto').randomBytes(conf.state.size).toString('hex');
        // save it in the client (to verify later):
        res.cookie(conf.state.cookie, state, {
            clientMaxAge: conf.state.timeout,
            httpOnly: true,
            domain: conf.frontend.host
        });

        if (provider === 'github') {
            res.json({
                next: conf.github.gate + '?' + qs.stringify({
                    client_id: conf.github.clientId,
                    redirect_uri: conf.frontend.protocol + '://' + conf.frontend.host + ':' + conf.frontend.port + '/auth/providers/github/callback',
                    scope: conf.github.scope,
                    state: state
                })
            });
        } else if (provider === 'google') {
            res.json({
                next: conf.google.gate + '?' + qs.stringify({
                    response_type: 'code',
                    client_id: conf.google.clientId,
                    redirect_uri: conf.frontend.protocol + '://' + conf.frontend.host + ':' + conf.frontend.port + '/auth/providers/google/callback',
                    scope: conf.google.scope,
                    state: state
                })
            });
        }

    }

}