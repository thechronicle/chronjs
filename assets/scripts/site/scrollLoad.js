var scrollLoadPage, scrollLoadLastDoc;

define(["jquery", "libs/jquery-ui"], function($) {
    var isLoadingPage = false; // stops multiple pages loading at once
    var noPagesLeftToLoad = false; // stops ajax requests from being issued once all articles for this page have been loaded
    var loadImage = null;
    var scrollLoadUrl, nextPageToLoad, scrollLoadHTML;
    

    scrollLoadPage = function(_scrollLoadUrl, _nextPageToLoad, _scrollLoadHTML) {
        scrollLoadUrl = _scrollLoadUrl;
        nextPageToLoad = _nextPageToLoad;
        scrollLoadHTML = _scrollLoadHTML;

        scrollLoad(loadPaginatedData);
    };

    scrollLoadLastDoc = function(_scrollLoadUrl, _scrollLoadHTML) {
        scrollLoadUrl = _scrollLoadUrl;
        scrollLoadHTML = _scrollLoadHTML;

        scrollLoad(loadDataFromLastDoc);
    };

    function scrollLoad(documentLoad) {
        $(document).ready(function() {
            loadImage = $("#loadImage");
            loadImage.hide();
        });

        $(window).scroll(function(){
            // if they scrolled to the bottom of the page, load the next 'page' of articles
            if(!isLoadingPage && !noPagesLeftToLoad && $(window).scrollTop() === ($(document).height() - $(window).height())) {
                loadImage.fadeIn('slow');
                isLoadingPage = true;
                documentLoad();
            }
        });
    }

    function addArticle(articles,i) {
        if(i < articles.length) {
            // add and fade in the article, then when fade in done add next article
            var HTMLToAdd = formatArticle(articles[i]);
            loadImage.before(HTMLToAdd)
            $(".document:last").hide();
            $(".document:last").fadeIn(function () {
                addArticle(articles,i+1);
            });
        }
        else {
            // no more articles to add
            loadImage.fadeOut(function () {
                isLoadingPage = false;
            });
        }
    }

    function formatArticle(article) {
        var addHTML = scrollLoadHTML;
        addHTML = addHTML.replace("URL_REPLACE",article.urls[0]);
        addHTML = addHTML.replace("HEADER_REPLACE",article.title);
        addHTML = addHTML.replace("DATE_REPLACE", $.datepicker.formatDate("MM d, yy", new Date(article.created*1000)));
        addHTML = addHTML.replace("AUTHOR_REPLACE",article.authors.join(", "));
        addHTML = addHTML.replace("TEASER_REPLACE",article.teaser);

        return addHTML;
    }

    // load the next page of documents for this set of params
    function loadPaginatedData() {
        $.get("/api/"+scrollLoadUrl+"&page="+nextPageToLoad, function(returnedData) {
            if(returnedData.docs.length === 0) {
                noPagesLeftToLoad = true;
                loadImage.fadeOut();
            }
            else {
                nextPageToLoad ++;

                // add the docs to this page, correctly formatted
                addArticle(returnedData.docs,0);
            }
        });
    }

    // load the next set of documents for this set of params, starting with the last document currently on the page
    function loadDataFromLastDoc() {
        var next = $(".result:last").attr('data-key');

        $.get(scrollLoadUrl, {key: next}, function (result) {
            if (result.docs.length == 1) {
                noPagesLeftToLoad = true;
                loadImage.fadeOut();
            }
            else {
                // add the docs to the page, correctly formatted,
                // ignoring the duplicate doc
                addArticle(result.docs, 0);
                $(".result:last").attr('data-key', JSON.stringify(result.next));
            }
        });
    }

});
