var solr = require('solr');
var dateFormat = require('dateformat');

var config = require('../../config');
var api = require("./api");
var _ = require("underscore");
var db = require("../../db-abstract");

// whenever the way an article should be indexed by solr is changed, this number should be incremented
// so the server knows it has to reindex all articles not using the newest indexing version. Keep the number numeric!
var INDEX_VERSION = 0.5005;
var client = null;

var search = {};
var exports = module.exports = search;

function getDBIDFromSolrID(solr_id) {
    // since our solr document ids are stored as db_id||DBNAME||DBHOST we need to parse out the db_id to use
    tempid = solr_id.split("||",1); 
    return tempid[0];
}

function createSolrIDFromDBID(db_id) {
    // since we may be using multiple dbs that all use the same db document id, to make each doc unique we append the db name and host
    // to the back. otherwise, one db's indexes will overwrite another db's indexes in solr.
    return db_id+"||"+db.getDatabaseName()+"||"+db.getDatabaseHost();
}

search.init = function() {
    client = solr.createClient(config.get('SOLR_HOST'),config.get('SOLR_PORT'),config.get('SOLR_CORE'),config.get('SOLR_PATH'));
}

// check for unindexed articles, or articles with index versioning below the current version, and index them in solr.
search.indexUnindexedArticles = function() {
    console.log('looking for articles to index...');
    db.search.docsIndexedBelowVersion(INDEX_VERSION, function(err, response) {
        // Attempt to index each file in row.
        response.forEach(function(row) {
            console.log('indexing "' + row.title + '"');
            
            var section = undefined;
            if(row.taxonomy && row.taxonomy[0]) section = row.taxonomy[0];

            search.indexArticle(row._id,row.title,row.body, section, row.authors, row.created, function(error2, response2) {
                if(error2) console.log(error2);
                else {
                    db.search.setArticleAsIndexed(row._id, INDEX_VERSION, function(error3, response3) {
                        if(error3) console.log(error3);
                        else console.log('indexed "' + row.title + '"');
                    });              
                }
            });
        });
    });
}

search.indexArticle = function(id,title,body,section,authors,createdDate,callback) {
	// adds the article to the solr database for searching	
	
    var date = new Date(createdDate * 1000); // turn seconds into milliseconds
    
    var solrDate;
    var solrYear;
    var solrMonth;
    var solrDay;
    try {
        solrDate = dateFormat(date,"UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"); // turns date into solr's date format: 1995-12-31T23:59:59Z
        solrYear = dateFormat(date,"yyyy");
        solrMonth = dateFormat(date,"mm");
        solrDay = dateFormat(date,"dd");
    }
    catch(err) { // if date is invalid use today's date
        solrDate = dateFormat(new Date(),"UTC:yyyy-mm-dd'T'HH:MM:ss'Z'");
        solrYear = dateFormat(new Date(),"yyyy");
        solrMonth = dateFormat(new Date(),"mm");
        solrDay = dateFormat(new Date(),"dd");
    }	

    // if you change this object (and in doing so change the index), you MUST increment INDEX_VERSION at the top of this script 
    var solrDoc = {
		id: createSolrIDFromDBID(id),
		type: 'article',
        author_sm: authors,
		title_text: title.toLowerCase(),
		body_text:  body.toLowerCase(),
        section_s: section,
		database_s: db.getDatabaseName(),
        database_host_s: db.getDatabaseHost(),
        created_date_d: solrDate,
        created_year_i: solrYear,
        created_month_i: solrMonth,
        created_day_i: solrDay,
	}; 

    // unindex the article before you index it, just incase it was using an old verion of the indexing
    client.del(createSolrIDFromDBID(id), null, function(err,resp) { 
        if(!err) console.log('unindexed "' + title + '"');
        else console.log(err);
                  
        client.add(solrDoc, {commit:true}, callback);
    }); 
}

// don't call this.
// removes all indexes from solr for the db we are using and sets all documents in the db we are using to not being indexed by solr
search.removeAllDocsFromSearch = function(callback) {
    api.docsByDate(null, function(err, response) {
        response.forEach(function(row) {
                console.log('unindexing "' + row.title + '"');
                client.del(createSolrIDFromDBID(row._id), null, function(err,resp) { 
                    console.log(resp);
                    db.merge(row._id, {indexedBySolr: false}, function(error3, response3) {
                        if(error3) console.log(error3);
                        else console.log('unindexed "' + row.title + '"');
                    });
                });
        });
    });     
    callback(null);
}

search.docsBySearchQuery = function(query, sortBy, sortOrder, facets, callback) {
    if(sortBy == 'relevance') sortBy = 'score';
    else if(sortBy == 'date') sortBy = 'created_date_d';
    else sortBy = 'score';

    if(sortOrder != 'asc') sortOrder = 'desc';

    var facetQueries = [];
    if(facets) {
        var indivFacets = facets.split(",");
        for(i in indivFacets) {
            var parts = indivFacets[i].split(":");
            
            if(parts[0] == 'Section') parts[0] = "section_s";
            else if(parts[0] == 'Author') parts[0] = "author_sm";
            else if(parts[0] == 'Year') parts[0] = "created_year_i";
            else if(parts[0] == 'Month') parts[0] = "created_month_i";
            else if(parts[0] == 'Day') parts[0] = "created_day_i";
                
            facetQueries.push(parts[0]+":"+parts[1]);
        } 
    }

    querySolr(query, {facet: true, "facet.field":["section_s","author_sm","created_year_i"], "fq":facetQueries, rows: 25, fl: "*,score", sort: sortBy + " " + sortOrder}, callback);
}

function querySolr(queryWords,options,callback) {
    queryWords = queryWords.toLowerCase();
    var words = queryWords.split(" ");
			
	var fullQuery = "database_host_s:"+db.getDatabaseHost()+" AND database_s:"+db.getDatabaseName() +" AND (";
    for(index in words) {
        if(index != 0) fullQuery = fullQuery + " OR ";
        fullQuery = fullQuery + "title_text:" + words[index] + "* OR body_text:" + words[index] + "*";
    }
    fullQuery = fullQuery + ")";
	
	client.query(fullQuery, options, function(err,response) {
		if(err) {
			return callback(err);
		}

        var responseObj = JSON.parse(response);
        console.log(responseObj);
        
        // put facet into an easily manipulitable form
        var facets = {};
        if(responseObj.facet_counts) {
            for(var fieldName in responseObj.facet_counts.facet_fields) {
                var niceName = fieldName;
                if(fieldName == 'section_s') niceName = "Section";
                else if(fieldName == 'author_sm') niceName = "Author";
                else if(fieldName == 'created_year_i') niceName = "Year";    
                else if(fieldName == 'created_month_i') niceName = "Month";    
                else if(fieldName == 'created_day_i') niceName = "Day";         

                facets[niceName] = {};
                var field = responseObj.facet_counts.facet_fields[fieldName];
                for(var i = 0; i < field.length; i += 2) {
                    if(field[i+1] > 0) {
                        facets[niceName][field[i]] = field[i+1];
                    }
                }
            }            
        }
        console.log(facets);
        
        var ids = [];
        var tempid;
        var docs = responseObj.response.docs;
        console.log(docs);
        for(var docNum in docs)
        {
            var tempid = getDBIDFromSolrID(docs[docNum].id);
            ids.push(tempid);
        }
        
        api.docsById(ids,function(err, docs) {
            if (err) callback(err);

            // replace each array element with the actual document data for that element            
            docs = _.map(docs, function(doc) {
                return doc.doc;
            });
            
            // remove any null array elements.
            docs = _.compact(docs);

            callback(null, docs, facets);
        });
    });
}
