function loadFormJson(callbackFn) {
  var animal = $.getQueryParameters().animal,
      title = animal.replace('-', ' ') + ' Surrender Form';

  $('#animal-type').attr('src', '/img/' + animal + '.png');
  $('#title').text(title);

  $.ajax({
      url: '/get-intake-questions',
      dataType: 'json',
      method: 'GET',
      data: {
        animal: animal
      },
      success: callbackFn,
      error: function() {
          console.log(arguments);
          console.log('error, not loaded');
      }
  });
}

function cssPercent(fraction) {
    return (fraction*100).toFixed(2) + "%";
}
function makeCrumb(index) {
    return $('<div>').addClass('crumb').text(index);
}
// generate appropriate number of breadcrumbs based on the number of
// pages we have
function generateCrumbs(numPages, $crumbWrapper) {
    var $crumbs = [];
    var wrapperWidth = $crumbWrapper.innerWidth();
    var crumbWidth = null;
    for (var i=0; i < numPages; i++) {
        var $crumb = makeCrumb(i+1);
        // Assume all crumbs are same width
        if (i === 0) {
            // We have to add to DOM before attempting to read the width,
            // or else we get zero-widths, so temporarily add it
            // to read width, then remove it to be properly added
            // later
            $crumbWrapper.append($crumb);
            crumbWidth = $crumb.outerWidth();
            $crumb.remove();
        }
        var leftCss;
        if (numPages === 1) {
            leftCss = cssPercent(
                (wrapperWidth/2 - crumbWidth/2) / wrapperWidth
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
            var columnWidth = numberLineWidth / (numPages-1);
            // these lines could be combined, but are left for clarity
            var centerPx = (columnWidth * i) + crumbWidth/2;
            var leftPx = centerPx - crumbWidth/2;
            var leftPct = leftPx / wrapperWidth;
            leftCss = cssPercent(leftPct);
        }
        $crumb.css({
            'left': leftCss,
            'position': 'absolute'
        });
        $crumbs.push($crumb);
    }
    return $crumbs;
}

function updateProgressIndicator(currPageIndex, totalPages) {
    var $progress = $('#progress-indicator');
    var $currIndex = $progress.find('.curr-index');
    $currIndex.text(currPageIndex);

    var $totalPages = $progress.find('.total-pages');
    $totalPages.text(totalPages);
}

window.onload = function() {
    var $form = $("#form-container form");
    var $dynamicContainer = $form.find("#dynamic-content");

    //Makes the header
    var $query = $.getQueryParameters();
    var animal = $query.animal;
    var headerTitle = animal.replace("-", " ") + " Surrender Form";
    var imgSrc = '/img/' + animal + '.png';
    $("#animal-type").addClass(animal);
    $("#animal-type").attr("src", imgSrc);
    $("#title").text(headerTitle);

    loadFormJson(function(json) {
        var $formContent = generateFormContent(json);
        $dynamicContainer.append($formContent);
        var $pages = $dynamicContainer.find('.page');
        var numPages = $pages.length;
        updateProgressIndicator(1, numPages);
        // generate appropriate number of breadcrumbs based on
        var $crumbWrapper = $('#breadcrumbs');
        var $crumbs = generateCrumbs($pages.length, $crumbWrapper);
        $crumbWrapper.prepend($crumbs);
        var $prevButton = $('#prev-button');
        var $nextButton = $('#next-button');
        var $submitButton = $("#submit-button");
        var $lastPage = $pages[$pages.length-1];
        $submitButton.on('click', function(e) {
            e.preventDefault();
            if (validateForm($lastPage)) {
              $form.submit();
            }
        });
        var pagination = new Pagination(
            $pages, $crumbs, $prevButton, $nextButton,
            // On page switch, enable/disable the submit button
            // accordingly
            function(pageSwitchData) {
                var newIndex = pageSwitchData.newIndex;
                var totalPages = pageSwitchData.totalPages;
                if (newIndex === totalPages-1) {
                    $submitButton.show();
                    $nextButton.hide();
                } else {
                    $submitButton.hide();
                    $nextButton.show();
                }
                updateProgressIndicator(newIndex+1, totalPages);
            },
            validateForm
        );
    });
};
