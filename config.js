var configuration = {
    "profiles": {
        "dev": {
            
            "COUCHDB_URL":"https://chrondev:pikachu@chrondev.iriscouch.com",
            "COUCHDB_DATABASE":"dev",

            "SERVER_PORT":"4000",

            "ADMIN_USERNAME":"dean",
            "ADMIN_PASSWORD":"dean",

            "REDIS_URL":"redis://jodoglevy:2b258cbdcbbce003452a0ff4279d8701@barreleye.redistogo.com:9148/",

            "SOLR_HOST":"index.websolr.com",
            "SOLR_PORT":"80",
            "SOLR_PATH":"/solr",
            "SOLR_CORE":"/3f534ff3ff0",

            "S3_KEY":"AKIAJIH3MOVTAMXCFKXA",
            "S3_SECRET":"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",
            "S3_BUCKET":"chron_dev",

            "MAILCHIMP_API_KEY":"740856b1876fd04723d34bd00aa381d3-us2",
            "MAILCHIMP_LIST_ID":"bc302eeb8d",
            "MAILCHIMP_TEMPLATE_ID":"233513",

            "TAXONOMY_MAIN_SECTIONS":["News","Sports", "Opinion", "Recess", "Towerview"],
            "TAXONOMY_BAD_SECTIONS":[
                'News/Graduation Issue',
                'Sports/Tennis','Sports/Basketball',
                'Sports/Soccer','Sports/Golf',
                'Sports/Lacross', 'Sports/Sports Briefs',
                'Sports/Olympics', 'Sports/Sports Features',
                'Sports/Sports Column', 'Sports/Department of Athletics',
                'Sports/Durham Bulls', 'Sports/Wrestling',
                'Sports/Volleyball', 'Sports/Fencing',
                'Sports/Field Hockey',
                'Opinion/Cartoons', 'Towerview/Blue Devil Crossing',
                'Towerview/Bus Stop',
                'Towerview/Blue Devil Crossing',
                'Towerview/Driving Distance',
                'Towerview/Rearview Mirror',
                'Towerview/The Devil\'s Details',
                'Towerview/The Green Light'
            ],

            "LAYOUT_GROUPS":{
                "Frontpage": {
                    "namespace": ['Layouts','Frontpage'],
                    "groups": ["Slideshow","Left Headlines","Right Headlines","Opinion","News","Sports","Recess","Towerview"]
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
            },

            "RSS_FEEDS":[
                {
                    title: "sportsblog",
                    url: "http://feeds.feedburner.com/chronicleblogs/sports"
                },
                {
                    title: "twitter-DukeChronicle",
                    url: "http://api.twitter.com/1/statuses/user_timeline.rss?screen_name=DukeChronicle"
                },
                {
                    title: "twitter-ChronicleRecess",
                    url: "http://api.twitter.com/1/statuses/user_timeline.rss?screen_name=ChronicleRecess"
                },
                {
                    title: "twitter-TowerviewMag",
                    url: "http://api.twitter.com/1/statuses/user_timeline.rss?screen_name=TowerviewMag"
                },
                {
                    title: "twitter-DukeBasketball",
                    url: "http://api.twitter.com/1/statuses/user_timeline.rss?screen_name=dukebasketball"
                },
                {
                    title: "twitter-ChronPhoto",
                    url: "http://api.twitter.com/1/statuses/user_timeline.rss?screen_name=ChronPhoto"
                },
                {
                    title: "twitter-ChronicleSports",
                    url: "http://api.twitter.com/1/statuses/user_timeline.rss?screen_name=chroniclesports"
                },
                {
                    title: "newsblog",
                    url: "http://feeds.feedburner.com/chronicleblogs/news"
                },
                {
                    title: "recessblog",
                    url: "http://feeds.feedburner.com/chronicleblogs/playground"
                },
                {
                    title: "blog-opinion",
                    url: "http://feeds.feedburner.com/chronicleblogs/backpages"
                }
            ]
        }
    },
    "activeConfigurationProfile":"dev"
};

exports.getConfiguration = function() {
    try {
        return configuration;
    } catch(err) {
        return null;
    }
};
