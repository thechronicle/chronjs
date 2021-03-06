var article = exports;

var api = require('../../api')
var config = require('../../config');
var db = require('../../db-abstract');
var log = require('../../log');
var redis = require('../../redisclient');
var util = require("../../util");

var md = require('discount');
var _ = require("underscore");


var MAX_URL_LENGTH = 50;
var RESULTS_PER_PAGE = 25;

var VIDEO_PLAYERS = {
    "youtube": "<iframe width=\"560\" height=\"345\" src=\"http://www.youtube.com/embed/%s\" frameborder=\"0\" allowfullscreen></iframe>",
    "vimeo": "<iframe src=\"http://player.vimeo.com/video/%s?title=0&amp;byline=0&amp;portrait=0\" width=\"400\" height=\"225\" frameborder=\"0\"></iframe>"
};
var VIDEO_REGEX_FORMAT = "(\{%s:)([^}]+)(\})";


article.add = function (article, callback) {
    getAvailableUrl(URLify(article.title), 0, function(err, url) {
        if (err) return callback(err);

        var unix_timestamp = util.unixTimestamp();
        article.created = article.created || unix_timestamp;
        article.updated = article.created || unix_timestamp;
        article.urls = [ url ];
        article.indexedBySolr = api.search.getIndexVersion()
        article.renderedBody = api.article.renderBody(article.body);

        db.save(article, function(err, res) {
            if (err) return callback(err);
            api.search.indexArticle(res.id, article.title, article.renderedBody,
                                    article.taxonomy, article.authors,
                                    article.created, function (err) {
                                        if (err) callback(err);
                                        else callback(null, url, res.id);
                                    });
        });
    });
};

article.edit = function (id, article, callback) {
    api.docsById(id, function(err, res) {
        if (err) return callback(err);

        if (article.body)
            article.renderedBody = api.article.renderBody(article.body);
        article.updated = util.unixTimestamp();

        if (article.title && (URLify(article.title) !=  URLify(res.title))) {
            getAvailableUrl(URLify(article.title), 0, function(err, url) {
                if (err) return callback(err);

                article.urls = res.urls;
                article.urls.push(url);

                saveEditedDoc(id, article, res.created, url, callback);
            });
        }
        else saveEditedDoc(id, article, res.created, _.last(res.urls), callback);
    });
};

article.delete = function (id, rev, callback) {
    db.remove(id, rev, function (err) {
        if (err) callback(err);
        else api.search.unindexArticle(id, callback);
    });
};

article.getDuplicates = function (limit, callback) {
    db.article.getDuplicates(limit, function(err, docs) {
        var dups = [];
        var lastDoc = {};
        var addedLastDoc = false;

        for (var i = 1; i < docs.length; i++) {
            var doc = docs[i].value;
            
            // if the titles are the same, and the documents were created within a day of eachother
            if(doc.title == lastDoc.title && Math.abs(doc.created-lastDoc.created) <= 86400) {
                if(!addedLastDoc) dups.push(lastDoc);
                dups.push(doc);
                addedLastDoc = true;
            }
            else addedLastDoc = false;

            lastDoc = doc;
        }

        callback(err, dups);
    });
};

article.getByUrl = function(url, callback) {
    db.article.getByUrl(url, function(err, res) {
        if (err) return callback(err);

        if (res.length == 0) {
            return callback("Article '" + url + "' does not exist");
        }

        var doc = {};
        res.forEach(function (key, value) {
            var docType = key[1];

            if (docType === "article") {
                doc = value;
                doc.images = {};
            }
            else if (docType === "images") {
                if (value.url) {
                    value.url = api.s3.getCloudFrontUrl(value.url);
                }
                var imageType = key[2];
                doc.images[imageType] = value;
            }
        });
        callback(null, doc);
    });
};

article.getByAuthor = function (author, taxonomy, limit, start, callback) {
    limit = (limit || RESULTS_PER_PAGE) + 1;
    taxonomy = taxonomy || [];
    db.article.getByAuthor(author, taxonomy, limit, start, callbackLastKey(limit, callback));
};

article.getByDate = function (limit, start, callback) {
    article.getByTaxonomy([], limit, start, callback);
};

article.getByTaxonomy = function (taxonomyPath, limit, start, callback) {
    limit = (limit || RESULTS_PER_PAGE) + 1;
    taxonomyPath = taxonomyPath || [];
    taxonomyPath = _.map(taxonomyPath, function (s) { return s.toLowerCase() });
    db.article.getByTaxonomy(taxonomyPath, limit, start, callbackLastKey(limit, callback));
};

article.renderBody = function (body) {
    _.each(VIDEO_PLAYERS, function (tag, name) {
        var pattern = new RegExp(util.format(VIDEO_REGEX_FORMAT, name), 'g');
        body = body.replace(pattern, function(match) {
            return util.format(tag, RegExp.$2);
        });
    });
    return md.parse(body);
};

function callbackLastKey (limit, callback) {
    return function (err, docs) {
        if (err) callback(err);
        else {
            var lastDoc;
            if (docs.length == limit) {
                lastDoc = docs.pop();
                delete lastDoc.value;
            }
            var docValues = _.map(docs, function (doc) { return doc.value });
            callback(null, docValues, lastDoc);
        }
    }
}

function saveEditedDoc(id, doc, docCreatedDate, url, callback) {
    // reset redis cache
    redis.client.del("article:" + url);

    db.merge(id, doc, function(err, res) {
         if (err) callback(err);
        
        // only reindex the article if they edited the search fields
        else if (doc.title && doc.body) {
            api.search.indexArticle(id, doc.title, doc.renderedBody, doc.taxonomy, doc.authors, docCreatedDate, function (err) {
                if (err) callback(err);
                else callback(null, url);
            });
        }
        else callback(null, url);
    });
}

//from http://snipt.net/jpartogi/slugify-javascript/
function URLify(s, maxChars) {
    maxChars = maxChars || MAX_URL_LENGTH;

    var removelist = ["a", "an", "as", "at", "before", "but", "by", "for", "from",
                      "is", "in", "into", "like", "of", "off", "on", "onto", "per",
                      "since", "than", "the", "this", "that", "to", "up", "via",
                      "with"];
    
    var r = new RegExp("\\b(" + removelist.join("|") + ")\\b", "gi");
    s = s.replace(r, "");
    
    s = s.replace(/[^-\w\s]/g, "");  // remove unneeded chars
    s = s.replace(/^\s+|\s+$/g, ""); // trim leading/trailing spaces
    s = s.replace(/[-\s]+/g, "-");   // convert spaces to hyphens
    s = s.toLowerCase();             // convert to lowercase
    s = s.substring(0, maxChars);    // trim to first num_chars chars
    return s.replace(/\-$/, "");
}

function getAvailableUrl(url, n, callback) {
    var new_url = url;
    if(n != 0) {
        new_url = new_url + "-" + n;
    }
    db.view("articles/urls", {key: [new_url, "article"]}, function(err, res) {
        if(err) {
            callback(err, null);
        }
        else if(res.rows.length == 0) {
            callback(null, new_url);
        }
        else {
            getAvailableUrl(url, n + 1, callback);
        }
    });
}
