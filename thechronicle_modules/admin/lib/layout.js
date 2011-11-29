var site = require('../../api/lib/site.js');
var taxonomy = require('../../api/lib/taxonomy.js');
var groups = require('../../api/lib/group.js');
var api = require('../../api');
var _ = require("underscore");


var GROUP_CONFIG = {
    "Frontpage": {
        "namespace": ['Layouts','Frontpage'],
        "groups": ["Breaking","Slideshow","Left Headlines","Right Headlines","Opinion","News","Sports","Recess","Towerview"]
    },
    "News": {
        "namespace": ['Layouts','News'],
        "groups": ["Featured", "Right Headlines", "Headlines", "Stories"]
    },
    "Sports": {
        "namespace": ['Layouts','Sports'],
        "groups": ["Slideshow", "Stories"]
    },
    "Opinion": {
        "namespace": ['Layouts','Opinion'],
        "groups": ["Featured","Columnists","Edit Board","More Columnists"]
    },
    "Recess": {
        "namespace": ['Layouts','Recess'],
        "groups": ["Featured","Sandbox","Interviews","Reviews","Stories"]
    },
    "Towerview": {
        "namespace": ['Layouts','Towerview'],
        "groups": ["Featured","Savvy","Wisdom","Editors Note","Prefix"]
    }
};



exports.bindPath = function (app) {
    return function() {
        app.get('/group/:group', site.checkAdmin, _getDocsInSection);
    }
};

function _getDocsInSection(req,res) {
    var section = req.query.section;
    
    if (section) {
        api.taxonomy.docs(section, 30,
        function (err, docs) {
            if (err) globalFunctions.showError(res, err);
            else {
                docs = docs.map(function (doc) {
                    return doc;
                });
                renderPage(req,res,docs);
            }
        });
    }
    else {
        api.docsByDate(null, null,
        function (err, docs) {
            if (err) globalFunctions.showError(res, err);
            else renderPage(req,res,docs);
        });
    }
};

function renderPage(req,res,section_docs) {
    var group = _capitalize(req.params.group);

    var section_docs = _.sortBy(section_docs, function (doc) {
        return doc.title;
    }); // sort section docs alphabetically
    
    // get and show the current groupings
    api.group.docs(GROUP_CONFIG[group].namespace, null, function (err, group_docs) {
        res.render("admin/layout",
        {
            layout:"layout-admin.jade",
            locals:{
                page: group,
                groups: GROUP_CONFIG[group].groups,
                mainSections: taxonomy.getMainSections(),
                sectionDocs: section_docs,
                groupDocs: group_docs,
                nameSpace: GROUP_CONFIG[group].namespace
            }
        });
    });
}

function _capitalize(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}
