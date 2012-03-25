var db = require('./db-abstract');
var _ = require('underscore');

var authors = exports;

authors.getLatest = function (authorName, taxonomy, count, callback) {
    var query = {
        startkey:[authorName, {}],
        endkey:[authorName],
        descending:true,
        limit:count,
        include_docs:true
    };

    if (taxonomy) {
        query.startkey = [authorName, taxonomy, {}];
        query.endkey = [authorName, taxonomy];
        query.descending = true;
    }

    db.view('articles/authors_and_taxonomy', query,
            function (err, res) {
                callback(err, _.pluck(res, 'doc'));
            }
    );
};

authors.getInfo = function(authorName, callback) {
    var query = {
        startkey:authorName.toLowerCase(),
        include_docs:true
    };

    db.view('articles/author_info', query,
            function (err, res) {
                callback(err, _.pluck(res, 'doc'));
            });
};