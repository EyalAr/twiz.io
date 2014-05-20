module.exports = function(cMongo, cRedis, conf, log) {

    return function(req, res) {

        var request = require('request'),
            async = require('async');

        async.waterfall([
            verifyState,
            getAccessToken,
            getUserInfo,
            generateSession,
            updateMongoUser,
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
                log('State cookie does not match \'state\' parameter. %s !== %s', callbackState, cookieState);
                return next('State cookie does not match \'state\' parameter');
            }

            if (!req.query.code) {
                log('Missing \'code\' parameter from Google callback. %s', req.query.code);
                return next('Missing \'code\' parameter from Google callback');
            }

            next(null, req.query.code);

        }

        function getAccessToken(code, next) {

            //exchange code for permenant token

            var params = {
                url: conf.google.exchange,
                form: {
                    client_id: conf.google.clientId,
                    client_secret: conf.google.clientSecret,
                    code: code,
                    grant_type: 'authorization_code',
                    redirect_uri: conf.frontend.protocol + '://' + conf.frontend.host + ':' + conf.frontend.port + '/auth/providers/google/callback'
                }
            };

            request.post(params, function(error, response, body) {

                if (error || response.statusCode !== 200) {
                    log('Cannot obtain access token from Google. %s. %s. %s', error, response.statusCode, JSON.stringify(body));
                    return next('Cannot obtain access token from Google');
                }

                next(null, JSON.parse(body));

            });

        }

        function getUserInfo(tokenDetails, next) {

            // get user info from google

            var params = {
                url: conf.google.getUser,
                headers: {
                    Authorization: 'Bearer ' + tokenDetails.access_token
                }
            }

            request.get(params, function(error, response, body) {

                if (error || response.statusCode !== 200) {
                    log('Cannot obtain user info from Google. %s. %s. %s', error, response.statusCode, body);
                    return next('Cannot obtain user info from Google');
                }

                var user = JSON.parse(body);
                user.access_token = tokenDetails.access_token;
                user.expires_in = tokenDetails.expires_in;
                user.token_type = tokenDetails.token_type;

                next(null, user);

            });

        }

        function generateSession(user, next) {

            var session = {
                ip: req.ip,
                agent: req.headers['user-agent'],
                created: new Date().getTime()
            }

            cMongo.collection(conf.mongo.sessionsCollection).insert(session, {
                safe: true
            }, function(err, docs) {

                if (err) {
                    log('Mongo error. %s', err);
                    return next('Mongo error');
                }

                next(null, user, docs[0]._id);

            });

        }

        function updateMongoUser(user, sessionKey, next) {

            // update user in mongo:

            cMongo.collection(conf.mongo.usersCollection).findAndModify({
                'google.id': user.id
            }, {}, {
                $set: {
                    google: user,
                    primary: 'google',
                    created: new Date().getTime()
                },
                $push: {
                    sessions: sessionKey
                }
            }, {
                new: true,
                upsert: true
            }, function(err, doc) {

                if (err) {
                    log('Mongo error. %s', err);
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
                    log('Redis error %s', err);
                    next('Redis error');
                }

                next(null, sessionKey);

            });

        }

        function setSessionCookie(sessionKey, next) {

            // remember sessionKey is a mongo ObjectID object
            res.cookie(conf.sessionKey.cookie, '' + sessionKey, {
                clientMaxAge: conf.sessionKey.clientMaxAge,
                httpOnly: true,
                domain: conf.frontend.host
            });

            next();

        }

    }

}