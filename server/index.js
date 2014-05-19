process.chdir(__dirname);

var path = require('path'),
    async = require('async'),
    express = require('express'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    initApiRoutes = require('./api/routes'),
    conf = require('./conf');

var app = express(),
    mongoClient,
    redisClient;

function log() {
    console.log.apply(this, arguments);
}

function initMongo(next) {
    require('mongodb').MongoClient.connect(conf.mongo.url, function(err, client) {
        mongoClient = client;
        next(err);
    });
}

function initRedis(next) {

    redisClient = require('redis').createClient(conf.redis.port, conf.redis.host, {
        auth_pass: conf.redis.password || null
    });

    redisClient.select(conf.redis.db, next);

}

function initServer(next) {

    // Serve static files:
    var staticPath = path.resolve(conf.frontend.static, './');
    app.use(conf.frontend.UIEndpoint, express.static(staticPath));

    app.use(bodyParser());
    app.use(cookieParser());

    initApiRoutes(app, mongoClient, redisClient, conf, log);

    next();

}

async.series([initMongo, initRedis, initServer], function(err) {
    if (err) {
        log('Unable to start server.', err);
    } else {
        app.listen(conf.frontend.port);
    }
});