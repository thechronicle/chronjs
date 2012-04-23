var async = require('async');
var cleanCSS = require('clean-css');
var crypto = require('crypto');
var requirejs = require('requirejs');
var fs = require('fs');
var gzip = require('gzip');
var stylus = require('stylus');
var walk = require('walk');
var _ = require('underscore');

var api = require('./thechronicle_modules/api');
var config = require('./thechronicle_modules/config');
var log = require('./thechronicle_modules/log');

var STYLE_DIR = __dirname + '/public/assets/styles/';
var DIST_DIR = __dirname + '/public/dist/';
var JS_SOURCES = [ 'site', 'admin' ];

exports.buildAssets = buildAssets;
exports.pushAssets = pushAssets;


function buildAssets(callback) {
    async.parallel({css: buildCSS, js: buildJavascript}, callback);
}

function pushAssets(paths, callback) {
    async.parallel({
        css: pushAll(paths.css, "text/css"),
        js: pushAll(paths.js, "application/javascript")
    }, function (err) {
        callback(err, paths);
    });
}

function pushAll(paths, type) {
    return function (callback) {
        async.forEach(_.keys(paths), function (src, callback) {
            fs.readFile('public' + paths[src], 'utf8', function (err, data) {
                if (err) callback(err);
                else {
                    storeS3(data.toString(), type, function (err, path) {
                        if (err) callback(err);
                        else {
                            paths[src] = path;
                            callback();
                        }
                    });
                }
            });
        }, callback);
    };
}

function buildCSS(callback) {
    var paths = {};
    fs.readdir(STYLE_DIR, function (err, files) {
        async.forEachSeries(files, function (file, cb) {
            fs.stat(STYLE_DIR + file, function (err, stats) {
                if (err) cb(err);
                else if (!stats.isDirectory()) cb();
                else buildCSSFile(file, function (err, path) {
                    paths[file] = path;
                    cb(err);
                });
            });
        }, function (err) {
            callback(err, paths);
        });
    });
}

function buildCSSFile(path, callback) {
    var style = "";

    var options = {
        styl: function (data, path, callback) {
            stylus(data).set('compress', true).set('filename', path)
                .render(callback);
        },
        css: function (data, path, callback) { callback(null, data) }
    };

    var walker = walk.walk(STYLE_DIR + path);
    
    walker.on('file', function (name, stats, next) {
        var extension = stats.name.match(/\.([a-z]+)$/);
        if (extension && extension[1] in options) {
            var compile = options[extension[1]];
            var filepath = name + '/' + stats.name;
            fs.readFile(filepath, function (err, contents) {
                if (err) callback(err);
                else compile(contents.toString(), filepath, function(err, data) {
                    if (err) {
                        log.error(err);
                        next(err);
                    }
                    else {
                        style += cleanCSS.process(data);
                        next();
                    }
                });
            });
        }
        else next();
    });
    
    walker.on('end', function (err) {
        if (err) callback(err);
        else {
            fs.writeFile(DIST_DIR + path + '.css', style, function (err) {
                callback(err, '/dist/' + path + '.css');
            });
        }
    });
}

function buildJavascript(callback) {
    var paths = {};
    async.forEachSeries(JS_SOURCES, function (src, cb) {
        buildJavascriptFile(src, function (err, path) {
            paths[src] = path;
            cb(err);
        });
    }, function (err) {
        callback(err, paths);
    });
}

function buildJavascriptFile(src, callback) {
    var config = { 
        baseUrl: 'public/assets/scripts',
        name: src + '/main',
        out: 'public/dist/' + src + '.js',
        paths: {
            jquery: 'require-jquery'
        }
    };
    if (process.env.NODE_ENV != 'production')
        config.optimize = 'none';

    requirejs.optimize(config, function (buildResponse) {
        callback(null, '/dist/' + src + '.js');
    });
}

function storeS3(data, type, callback) {
    var bucket = config.get('S3_STATIC_BUCKET');

    var md5sum = crypto.createHash('md5');
    md5sum.update(data);
    var path = '/dist/' + md5sum.digest('hex');

    gzip(data, function (err, buffer) {
        if (err) callback(err);
        else {
            api.s3.put(bucket, buffer, path, type, "gzip", function(err) {
                callback(err, config.get('CLOUDFRONT_STATIC') + path);
            });
        }
    });
}
