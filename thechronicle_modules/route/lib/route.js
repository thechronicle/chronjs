var api = require('../../api');
var admin = require('./admin');
var config = require('../../config');
var siteApi = require('./api');
var log = require('../../log');
var site = require('./site');
var xhrproxy = require('./xhrproxy');

var async = require('async');


// assigns the functionality needed before different modules are ready to be
// initilized (before config settings have been set)
exports.preinit = function (app) {
    app.get('/', site.checkConfig);
    app.get('/login', site.login);
    app.post('/login', site.loginData);
    app.get('/logout', site.logout);
    app.get('/config', site.config);
    app.post('/config', site.configData);
};

exports.siteInit = function (app) {

    app.namespace('/api', function () {
        app.get('/all', siteApi.articlesBySection);
        app.get('/section/*', siteApi.articlesBySection);
        app.get('/qduke', siteApi.articlesForQduke);

        app.get('/article/url/:url', siteApi.articleByUrl);

        app.post('/poll/:id/vote', siteApi.votePoll);
        app.get('/search', siteApi.searchArticles);
        app.get('/staff/:query', siteApi.articlesByAuthor);

        app.get('/article/:id', siteApi.readArticle);
        app.post('/article', api.site.checkAdmin, siteApi.createArticle);
        app.put('/article/:id', api.site.checkAdmin, siteApi.updateArticle);
        app.del('/article/:id', api.site.checkAdmin, siteApi.deleteArticle);

        app.post('/page', api.site.checkAdmin, siteApi.createPage);
        app.put('/page/:url', api.site.checkAdmin, siteApi.updatePage);

        app.get('/template/:name', api.site.checkAdmin, siteApi.template);
    });

    app.get('/', site.frontpage);
    app.get('/news', site.news);
    app.get('/sports', site.sports);
    app.get('/opinion', site.opinion);
    app.get('/recess', site.recess);
    app.get('/towerview', site.towerview);
    app.get('/section/*', site.section);

    app.get('/rss-source', site.rss);
    app.get('/rss-source/*', site.rss);
    app.get('/feed/all', redirect("/rss"));
    app.get('/rss', redirect("http://feeds.feedburner.com/thechronicle/all"));
    app.get('/rss/news', redirect("http://feeds.feedburner.com/thechronicle/news"));

    app.namespace('/page', function () {
        app.get('/:url', site.page);

        app.get('/newsletter', site.staticPage);
        app.get('/subscribe', site.staticPage);

        app.post('/newsletter', site.newsletterData);
    });

    // Makes search url more readable
    app.get('/search', site.search);

    // Webmaster tools stuff -- don't delete
    app.get('/mu-7843c2b9-3b9490d6-8f535259-e645b756', function (req, res) {
        res.send('42');
    });

    app.namespace('/article', function () {
        app.get('/new', api.site.checkAdmin, admin.addArticle);
        app.post('/', api.site.checkAdmin, admin.addArticleData);
        app.get('/:url', site.article);
        app.get('/:url/print', site.articlePrint);
        app.get('/:url/edit', api.site.checkAdmin, admin.editArticle);
        app.put('/:url/edit', api.site.checkAdmin, admin.editArticleData);
    });

    app.namespace('/staff', function () {
        app.get('/:name', site.staff);
        app.get('/:name/edit', api.site.checkAdmin, admin.editAuthor);
        app.put('/:name/edit', api.site.checkAdmin, admin.editAuthorData);
    });
    app.get('/users/:query', function (req, res) {
        res.redirect('/staff/' + req.params.query);
    });

    app.namespace('/admin', function () {
        app.get('/', api.site.checkAdmin, admin.index);
        app.get('/newsletter', api.site.checkAdmin, admin.newsletter);
        app.get('/manage', api.site.checkAdmin, admin.manage);
        app.get('/manage/:section', api.site.checkAdmin, admin.manage);
        app.get('/k4export', api.site.checkAdmin, admin.k4export);
        app.post('/k4export', api.site.checkAdmin, admin.k4exportData);
        app.post('/newsletter', api.site.checkAdmin, admin.newsletterData);
        app.get('/layout/group/:group', api.site.checkAdmin, admin.layout);
        app.get('/duplicates', api.site.checkAdmin, admin.duplicates);
        app.get('/author', api.site.checkAdmin, admin.author);
        app.get('/system/memory', api.site.checkAdmin, admin.memory);
    });

    app.namespace('/admin/image', function () {
        app.get('/manage', api.site.checkAdmin, admin.image.manage);
        app.get('/upload', api.site.checkAdmin, admin.image.upload);
        app.post('/upload', api.site.checkAdmin, admin.image.uploadData);
        app.get('/articles', api.site.checkAdmin, admin.image.articles);
        app.get('/delete', api.site.checkAdmin, admin.image.deleteImage);
        app.get('/:imageName', api.site.checkAdmin, admin.image.renderImage);
        app.post('/info', api.site.checkAdmin, admin.image.info);
        app.post('/crop', api.site.checkAdmin, admin.image.crop);
        app.post('/add', api.site.checkAdmin, admin.image.addImageToDoc);
        app.get('/remove/:imageId', api.site.checkAdmin, admin.image.removeImageFromDoc);
    });

    app.namespace('/admin/poll', function () {
    	app.get('/', api.site.checkAdmin, admin.managePoll);
    	app.get('/new', api.site.checkAdmin, admin.addPoll);
    	app.get('/:id', api.site.checkAdmin, admin.editPoll);
    	app.post('/', api.site.checkAdmin, admin.addPollData);
    	app.post('/:id', api.site.checkAdmin, admin.editPollData);
    });

    app.namespace('/admin/page', function () {
        app.get('/', api.site.checkAdmin, admin.pageIndex);
        app.get('/new', api.site.checkAdmin, admin.addPage);
        app.get('/:url/edit', api.site.checkAdmin, admin.editPage);
    });

    app.namespace('/xhrproxy', function() {
        app.get('/delete_activity', xhrproxy.delete_activity);
        app.get('/espn', xhrproxy.espn);
    })

    app.get('/sitemaps/news.xml.gz', site.newsSitemap);

/*
    app.get('/sitemaps/:query', function (req, res, next) {
        res.redirect(config.get("CLOUDFRONT_DISTRIBUTION") + req.url);
    });
*/

    //The 404 Route (ALWAYS Keep this as the last route)
    app.get('*', site.pageNotFound);

    return app;
};

exports.mobileInit = function (app) {
    app.get('*', site.mobile);
    return app;
};

function redirect (url) {
    return function(req, res) {
        res.redirect(url, 301);
    }
}
