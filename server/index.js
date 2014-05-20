process.chdir(__dirname);

var path = require('path'),
    async = require('async'),
    express = require('express'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    format = require('util').format,
    initApi = require('./api'),
    conf = require('./conf');

var app = express(),
    mongoClient,
    redisClient;

var debug = process.env['TWIZIO_ENV'] === 'development' || !! process.env['TWIZIO_DEBUG'];

function log() {
    if (debug) {
        var d = new Date();
        var args = Array.prototype.slice.call(arguments);
        args[0] = '%s\t' + args[0];
        args.splice(1, 0, d);
        console.log(format.apply(null, args));
    }
}

function initMongo(next) {
    log('Connecting to mongo at %s', conf.mongo.url);
    require('mongodb').MongoClient.connect(conf.mongo.url, function(err, client) {
        mongoClient = client;
        next(err);
    });
}

function initRedis(next) {
    log('Connecting to redis at %s:%s', conf.redis.host, conf.redis.port);
    redisClient = require('redis').createClient(conf.redis.port, conf.redis.host, {
        auth_pass: conf.redis.password || null
    });
    redisClient.select(conf.redis.db, next);
}

function initServer(next) {

    log('Initializing server');

    app.set('env', process.env['TWIZIO_ENV']);

    // Serve static files:
    var staticPath = path.resolve(conf.frontend.static, './');
    app.use(conf.frontend.UIEndpoint, express.static(staticPath));

    app.use(bodyParser());
    app.use(cookieParser());

    initApi(app, mongoClient, redisClient, conf, log);

    next();

}

async.series([initMongo, initRedis, initServer], function(err) {
    if (err) {
        log('Unable to start server. %s', err);
    } else {
        app.listen(conf.frontend.port);
        log('Listening to port %s', conf.frontend.port);
    }
});