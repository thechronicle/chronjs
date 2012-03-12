var _ = require('underscore');
var async = require('async');
var cradle = require('cradle');
var crypto = require('crypto');
var fs = require('fs');
var url = require('url');

var config = require('../../config');
var designDoc = require('./db-design').doc;
var log = require('../../log');

var DATABASE = null;
var DB_HOST = null;
var DB_PORT = null;

var db = exports;

db.group = require('./group.js');
db.image = require('./image.js');
db.taxonomy = require('./taxonomy.js');
db.search = require('./search.js');
db.authors = require('./authors.js');
db.database = require('./database.js');
db.page = require('./page.js');

db.getDatabaseName = function() {
    return DATABASE;
};

db.getDatabasePort = function() {
    return DB_PORT;
};

db.getDatabaseHost = function() {
    return DB_HOST;
};

db.connect = function (host, database) {
    log.info("Connecting to " + database + " at " + host);
    var couchdbUrl = url.parse(host);
    if (couchdbUrl.auth) {
        couchdbUrl.auth = couchdbUrl.auth.split(":");
    }

    if (!couchdbUrl.port) {
        (couchdbUrl.protocol === "https:") ? couchdbUrl.port = 443 : couchdbUrl.port = 80;
    }

    var conn = new (cradle.Connection)(couchdbUrl.protocol + '//' + couchdbUrl.hostname, couchdbUrl.port, {
        cache: false,
        auth:{username:couchdbUrl.auth[0], password:couchdbUrl.auth[1]}
    });

    return conn.database(database);
};

db.init = function(callback) {
	DATABASE = config.get("COUCHDB_DATABASE");
    DB_HOST = url.parse(config.get("COUCHDB_URL")).hostname;
    DB_PORT = url.parse(config.get("COUCHDB_URL")).port;

    // assign all methods of the cradle object to db
    var database = db.connect(config.get("COUCHDB_URL"),DATABASE);
    _.extend(db, database);

    db.exists(function (error,exists) {
          if(error)
        {
            log.error("ERROR db-abstract" + error);
            return callback(error);
        }

        // initialize database if it doesn't already exist
        if(!exists) {
            db.create();
            db.whenDBExists(db,function() {
                updateViews(callback);
            });
        }
        else {
             updateViews(callback);
        }
    });
};

// only calls the callback when the DB exists, loops until then. Should not be used anywhere other than db init due to its blocking nature
db.whenDBExists = function(database,callback) {
     database.exists(function (error,exists) {
        if(exists) callback();
        else db.whenDBExists(database,callback);     
     });
};

function updateViews(callback) {
    async.forEach(_.keys(designDoc), function (name, cb) {
       viewsAreUpToDate(name, designDoc[name], function(err, isUpToDate, newestModifiedTime, newestHash) {
           if (err) {
               log.warning(err);
               callback(err);
           }
           else if (isUpToDate)
               callback();
           else {
               log.notice('updating views to newest version - modified time: ' + newestModifiedTime + ' and hash: ' + newestHash);
               createViews(name, designDoc[name], newestModifiedTime, newestHash, callback);
           }
       });
    }, callback);
}

function viewsAreUpToDate(name, document, callback) {
    // calculate the hash of the local design doc    
    var md5sum = crypto.createHash('md5');
    md5sum.update(JSON.stringify(document, function(key, val) {
      if (typeof val === 'function') {
        return val + ''; // implicitly `toString` it
      }
      return val;
    }));
    var localHash = md5sum.digest('base64');

    fs.stat(__dirname + '/db-design.js', function(err, stats) {
        if (err) return callback(err);

        var localModifiedTime = stats.mtime;

        db.get('_design/' + name + '-versioning', function (err, res) {
            var currentHash = (res && res.views && res.views.hash) || '';
            
            // if the design document does not exist, or the modified time of the design doc does not exist, return false
            // check if the design doc file has been modified since the the last time it was updated in the db, and if so, if the hash of each is different
            var currentModifiedTime = res && res.views && res.views.lastModified;
            if (!currentModifiedTime || (new Date(currentModifiedTime) < new Date(localModifiedTime) && currentHash != localHash))
                return callback(null, false, localModifiedTime, localHash);
            else
                return callback(null, true, currentModifiedTime, currentHash);
        });
    });
}

function createViews(name, document, modifiedTime, hash, callback) {
    db.save('_design/' + name, document, function (err) {
        // update the versioning info for the design document
        if (err)
            callback(err);
        else
            db.save('_design/' + name + '-versioning', {lastModified: modifiedTime, hash: hash}, callback);
    });
}