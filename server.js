/* declare global configuration variables */
var PORT = process.env.PORT || 4000;

var config = require('./thechronicle_modules/config');

config.sync(function() {
	/* require npm nodejs modules */
	var express = require('express');
	require('express-namespace');
	var stylus = require('stylus');
	
	/* require internal nodejs modules */
	var globalFunctions = require('./thechronicle_modules/global-functions');
	var api = require('./thechronicle_modules/api/lib/api');
	var site = require('./thechronicle_modules/api/lib/site');
	var admin = require('./thechronicle_modules/admin/lib/admin');

	/* express configuration */
	var app = express.createServer();

	var publicDir = '/public';
	var viewsDir = '/views';

	function compile(str, path) {
	  return stylus(str)
		.set('filename', path)
		.set('compress', true);
	}
	
	// add the stylus middleware, which re-compiles when
	// a stylesheet has changed, compiling FROM src,
	// TO dest. dest is optional, defaulting to src

	app.use(stylus.middleware({
		src: __dirname + viewsDir
	  , dest: __dirname + publicDir
	  , compile: compile
	}));

	app.set('view engine', 'jade');

	// the middleware itself does not serve the static
	// css files, so we need to expose them with staticProvider
	app.use(express.static(__dirname + publicDir));
	app.use(express.bodyParser());

	app.set('views', __dirname + viewsDir);

	app.error(function(err, req, res, next){
		res.send(500);
		globalFunctions.log('ERROR: ' + err.stack);
	});

	/*** FRONTEND ***/
	app.get('/', site.renderRoot);
	app.get('/article-list', site.renderArticleList);
	app.get('/article/:url', site.renderArticle);
	app.get('/article/:url/edit', site.renderArticleEdit);
	app.get('/article/:url/image', site.renderImageList);
	app.get('/mobile/:groupname', site.renderMobileGroup);
	/*** !FRONTEND ***/
	
	/*** ADMIN ***/
	app = admin.init(app);

	/*** !ADMIN ***/

	console.log('Listening on port ' + PORT);
	app.listen(PORT);
});
