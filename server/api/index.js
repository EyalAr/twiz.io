module.exports = function(app, cMongo, cRedis, conf, log) {

    require('./auth')(app, cMongo, cRedis, conf, log);

}