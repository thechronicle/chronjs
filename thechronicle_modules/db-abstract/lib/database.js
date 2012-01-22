var db = require('./db-abstract');
var _ = require('underscore');

var database = exports;

database.findDuplicateUrls = function(callback) {
    var query = {
        reduce: true,
        group: true,
        min: 1,
        listLimit: 100
    };

    console.log("calling find dup")
    db.list('articles/filterCount/duplicate_urls', query,
            function (err, res) {
                console.log("results");
                console.log(res);
                callback(err, res);
            }
    );
};
