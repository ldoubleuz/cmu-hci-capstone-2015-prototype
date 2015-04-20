
(function() {
  'use strict';

  function makeCrumb(index) {
    return $('<div>').addClass('crumb').text(index);
  }

  function cssPercent(fraction) {
    return (fraction * 100).toFixed(2) + "%";
  }
  window.onload = function() {
    var $form = $("#form");
    var $pages = $('.page');
    var $prevButton = $('#prev-button');
    var $nextButton = $('#next-button');
    var $submitButton = $("#submit-button");

    // generate appropriate number of breadcrumbs based on JSON
    var $crumbs = [];
    var $crumbWrapper = $('#breadcrumbs');
    var wrapperWidth = $crumbWrapper.innerWidth();
    var crumbWidth = null;
    for (var i = 0; i < $pages.length; i++) {
      var $crumb = makeCrumb(i + 1);

      // Assume all crumbs are same width
      if (i === 0) {
        // We have to add to DOM attempting to read the width,
        // or else we get zero-widths, so temporarily add it
        // to read width, then remove it to be properly added
        // later
        $crumbWrapper.append($crumb);
        crumbWidth = $crumb.outerWidth();
        $crumb.remove();
      }

      var leftCss;
      if ($pages.length === 1) {
        leftCss = cssPercent(
          (wrapperWidth / 2 - crumbWidth / 2) / wrapperWidth
        );
      } else {
        // Distribute the crumbs along a line such that they are
        // evenly spaced, with the first crumb touching the left of
        // the wrapper, and the last crumb touching the right of the
        // wrapper. We do this by thinking of distributing the crumb
        // centerpoints as points on a numberline that is slightly
        // smaller than the full wrapper so that the first and last
        // crumbs don't overflow their parent
        var numberLineWidth = wrapperWidth - crumbWidth;
        var columnWidth = numberLineWidth / ($pages.length - 1);
        // these lines could be combined, but are left for clarity
        var centerPx = (columnWidth * i) + crumbWidth / 2;
        var leftPx = centerPx - crumbWidth / 2;
        var leftPct = leftPx / wrapperWidth;

        leftCss = cssPercent(leftPct);
      }

      $crumb.css({
        left: leftCss,
        position: 'absolute'
      });
      $crumbs.push($crumb);
    }

    $crumbWrapper.find('.crumb').remove();
    $crumbWrapper.prepend($crumbs);

    $submitButton.on('click', function(e) {
      e.preventDefault();
      $form.submit();
    });

    var pagination = new Pagination(
      $pages, $crumbs, $prevButton, $nextButton,
      // On page switch, enable/disable the submit button
      // accordingly
      function(pageSwitchData) {
        var newIndex = pageSwitchData.newIndex;
        var totalPages = pageSwitchData.totalPages;

        if (newIndex === totalPages - 1) {
          $submitButton.show();
          $nextButton.hide();
        } else {
          $submitButton.hide();
          $nextButton.show();
        }
      });

//    $form.on('submit', function(e) {
//      e.preventDefault();
//
//      var $serialized = $form.serializeArray();
//      console.log($serialized);
//      alert(JSON.stringify($serialized));
//    });
  };
})();
