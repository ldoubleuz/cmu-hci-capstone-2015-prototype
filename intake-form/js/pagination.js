/* onPageChangeFn is an optional callback that gets called whenever the page is
 * switched, and gets called with one parameter: a dictionary in the format
 * {
 *    'newIndex': The index of the page we just switched to,
 *    'oldIndex': The index of the page we switched from,
 *    'totalPages': The total number of pages we are handling
 * }
 */
var Pagination = function($pages, $crumbs, $prevButton, $nextButton, onPageChangeFn) {
    this.$pages = $pages;
    this.$crumbs = $crumbs;
    this.$prevButton = $prevButton;
    this.$nextButton = $nextButton;
    this._onPageChangeFn = onPageChangeFn;

    this._currCrumbClass = 'crumb-cur';
    this._prevCrumbClass = 'crumb-prev';
    this._nextCrumbClass = 'crumb-next';

    // setup breadcrumb click listeners
    for (var i=0; i < this.$crumbs.length; i++) {
        var $crumb = $(this.$crumbs[i]);

        var $page = $(this.$pages[i]);
        var pageTitle = $page.find('.form-title').text();

        $crumb.attr('title', pageTitle);

        $crumb.click(function(index, showPageFn) {
            return function() {
                showPageFn(index);
            };
        }(i, this.showPage.bind(this)));
    }

    this._currIndex = 0;
    this.showPage(this._currIndex);

    var scrollToTop = function() {
        $('body').animate({
            scrollTop: 0
        });
    };

    // add listeners to prev/next buttons
    $prevButton.click(function(){
        this.showPage(this._currIndex-1);
        scrollToTop();
    }.bind(this));

    $nextButton.click(function(){
        this.showPage(this._currIndex+1);
        scrollToTop();
    }.bind(this));

};

Pagination.prototype.showPage = function(showIndex) {
    if (!(0 <= showIndex && showIndex < this.$pages.length)) {
        return;
    }

    for (var i=0; i < this.$pages.length; i++) {
        var $page = $(this.$pages[i]);
        var $crumb = $(this.$crumbs[i]);

        $crumb.removeClass([
            this._prevCrumbClass, this._nextCrumbClass, this._currCrumbClass
        ].join(' '));

        var newCrumbClass = '';
        if (i === showIndex) {
            $page.show();
            newCrumbClass = this._currCrumbClass;
        } else {
            $page.hide();
            if (i < showIndex) {
                newCrumbClass = this._prevCrumbClass;
            } else {
                newCrumbClass = this._nextCrumbClass;
            }
        }
        $crumb.addClass(newCrumbClass)
    }
    var prevIndex = this._currIndex;
    this._currIndex = showIndex;

    if (this._onPageChangeFn) {
        this._onPageChangeFn({
            'newIndex': showIndex,
            'oldIndex': prevIndex,
            'totalPages': this.$pages.length
        });
    }

    // TODO: enable/disable prev/next buttons accordingly to new index
};
