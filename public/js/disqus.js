var disqus_developer = 1; // developer mode is on. REMOVE THIS IN PRODUCTION SET UP
var disqus_shortname = 'dukechronicle';
var disqus_identifier;

function loadDisqusForArticle(articleID)
{
	disqus_identifier = articleID;
	
	(function() {
	    var dsq = document.createElement('script'); dsq.type = 'text/javascript'; dsq.async = true;
	    dsq.src = 'http://' + disqus_shortname + '.disqus.com/embed.js';
	    (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);
	})();
}

function loadDisqus()
{
	(function () {
	    var s = document.createElement('script'); s.async = true;
	    s.type = 'text/javascript';
	    s.src = 'http://' + disqus_shortname + '.disqus.com/count.js';
	    (document.getElementsByTagName('HEAD')[0] || document.getElementsByTagName('BODY')[0]).appendChild(s);
	}());
}
