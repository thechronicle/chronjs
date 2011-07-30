exports.createViews = function(db) {
	var views = {
	    descendants: {
		map: function(doc) {
		    if (doc.title) {
		        for (var i in doc.path) {
		            emit([doc.path[i], doc.path], doc)
		        }
		    }
		}
	    },
	    tree: {
		map: function(doc) {
		    if (doc.taxonomy) {
		        emit(doc.taxonomy, doc)
		    }
		}
	    },
	    // return all doc ids keyed by doc url if one exists
	    urls: {
		map: function(doc) {
		    if(doc.urls) {
		        for(var i in doc.urls) {
		            emit(doc.urls[i], doc._id);
		        }
		    }
		}
	    },
	    // return all doc ids keyed by document author name if one exists
	    authors: {
		map: function(doc) {
		    if(doc.authors) {
		        for(var i in doc.authors)
		            emit(doc.authors[i], doc._id);
		    }
		}
	    },
	    // get the uuid of all children keyed by fully qualified group name
	    groups: {
		map: function(doc) {
            if(doc.groups) {
                doc.groups.forEach(function(group) {
                    emit(group[0], {weight: group[1], title: doc.title});
                });
            }
		},
        reduce: function(keys, values, rereduce) {
          if (rereduce) {
            return sum(values);
          } else {
            return values.length;
          }
        }
	    },
	    // return articles keyed by date
	    all_by_date: {
		map: function(doc) {
		    if(doc.title && doc.urls) {
		        emit(doc.created, doc);
		    }
		}
	    },
	    image_originals: {
		map: function(doc) {
		    if(doc.imageVersions) {
		        emit(doc.name, doc);
		    }
		}
	    },
	    photographers: {
		map: function(doc) {
		    if(doc.photographer) {
		        emit(doc.photographer, doc);
		    }
		}
	    },
	    image_versions: {
	        map: function(doc) {
	            if(doc.original) {
	                emit(doc.original, doc);
	            }
	        }
	    }
	};

	db.save('_design/articles', views);
}
