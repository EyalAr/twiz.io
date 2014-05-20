module.exports = function(app, cMongo, cRedis, conf, log) {

    var qs = require('querystring'),
        async = require('async'),
        ObjectID = require('mongodb').ObjectID;

    // User routes:
    app.use('/user/get', wrap(getUser));

    // Helpers:

    function wrap(handler) {

        return function(req, res) {

            async.waterfall([

                function(next) {
                    verifySessionAndGetUserId(req.cookies[conf.sessionKey.cookie], next);
                },

                function(userId, next) {
                    handler(req, res, userId, next);
                }

            ], function(err) {

                if (err) {
                    res.json({
                        success: false,
                        error: err
                    });
                }

                res.send();

            });

        }

    }

    function verifySessionAndGetUserId(sessionKey, next) {

        var sessionRedisKey = conf.redis.sessionPrefix + sessionKey;

        cRedis.hgetall(sessionRedisKey, function(err, hash) {

            if (err) {
                log('Redis error. %s', err);
                return next('Redis error');
            }

            if (!hash) {
                return next('Session key does not exist on server');
            }

            var now = new Date().getTime();
            var last = parseInt(hash.last);
            var userId = hash.userid;

            if (now - last > conf.sessionKey.serverRefreshInterval) {
                return next('Session key expired');
            }

            cRedis.hset(sessionRedisKey, 'last', now, function(err) {

                if (err) {
                    log('Redis error. %s', err);
                    return next('Redis error');
                }

                next(null, userId);

            });

        });

    }

    // Handlers:
    // ---------

    function getUser(req, res, userId, next) {

        cMongo.collection(conf.mongo.usersCollection).findOne({
            _id: ObjectID(userId)
        }, function(err, doc) {

            if (err) {
                log('Unable to get user.', err);
                return next('Unable to get user');
            }

            res.json(doc);
            next();

        });

    }

}