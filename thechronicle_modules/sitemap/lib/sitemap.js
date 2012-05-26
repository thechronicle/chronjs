var sitemap = exports;

var async = require('async');
var builder = require('xmlbuilder');
var gzip = require('gzip');
var _ = require('underscore');

var api = require('../../api');
var config = require("../../config");
var log = require('../../log');
var util = require("../../util");

var SITEMAP_URL_LIMIT = 10000;
var NEWS_URL_LIMIT = 1000;


sitemap.generateAllSitemaps = function (callback) {
    async.parallel([
        function (cb) {
            sitemap.latestFullSitemap('public/sitemaps/sitemap', function (err) {
                if (err) log.warning("Couldn't build full sitemap: " + err);
                cb(err);
            });
        },
        function (cb) {
            sitemap.latestNewsSitemap('public/sitemaps/news_sitemap', function (err) {
                if (err) log.warning("Couldn't build news sitemap: " + err);
                cb(err);
            });
        }], callback);
};

sitemap.latestFullSitemap = function (path, callback) {
    latestSitemaps(SITEMAP_URL_LIMIT, {}, false, [], function (err, sitemaps) {
        if (err) return callback(err);
        log.debug(sitemaps);
    });
};

sitemap.latestNewsSitemap = function (path, callback) {
    var query = { last: (new Date()).getTime() / 1000 - 2 * 24 * 60 * 60 };
    latestSitemaps(NEWS_URL_LIMIT, query, true, [], function () {
        
    });
}

function latestSitemaps(limit, query, news, partials, callback) {
    api.article.getByDate(limit, query, function (err, results, nextKey) {
        if (err) callback(err);
        else if (results.length == 0) callback("No new articles for sitemap");
        else {
            gzip(generateSitemap(results, news), function (err, buffer) {
                if (err) return callback(err);

                partials.push(buffer);
                if (nextKey) {
                    query = _.extend(query, nextKey);
                    latestSitemaps(limit, query, news, partials, callback);
                }
                else {
                    callback(null, partials);
                }
            });
        }
    });
}

function generateSitemapIndex(files, date, callback) {
    var doc = builder.create();
    var root = doc.begin("sitemapindex", { version: "1.0", encoding: "UTF-8" }).
        att("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9");
    async.forEach(files, function (path, cb) {
        var prefix = "http://www." + config.get('DOMAIN_NAME') + "/";
        root.ele("sitemap").
            ele("loc", prefix + path.replace(/public\//g,"") + ".gz").up().
            ele("lastmod", dateFormat(date, "yyyy-mm-dd"));
        cb();
    }, function (err) {
        callback(err, doc.toString());
    });
}

function generateSitemap(docs, news) {
    var doc = builder.create();
    var root = doc.begin("urlset", { version: "1.0", encoding: "UTF-8" }).
        att("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9");
    if (news) {
        root.att("xmlns:news", "http://www.google.com/schemas/sitemap-news/0.9");
    }

    _.each(docs, function (doc, cb) {
        var prefix = "http://www." + config.get('DOMAIN_NAME') + "/article/";
        var date = getDate(doc);
        var url = root.ele('url');
        url.ele('loc', prefix + _.last(doc.urls)).up().
            ele('lastmod', date).up().
            ele('changefreq', 'never').up().
            ele('priority', '0.5').up();
        if (news)
            url.ele('news:news').
            ele('news:publication').
            ele('news:name', 'The Chronicle').up().
            ele('news:language', 'en').up().up().
            ele('news:publication_date', date).up().
            ele('news:title', doc.title);
    });
    return doc.toString();
}

function getDate(doc) {
    var date = doc.updated || doc.created;
    if (date === undefined)
        return undefined;
    return util.formatTimestamp(date, "yyyy-mm-dd");
}
