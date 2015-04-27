(function() {
  'use strict';

  var $animalWrapper = $('.animal-wrapper');

  $animalWrapper.click(function() {
    $animalWrapper.removeClass('selected');
    this.classList.add('selected');
    $('#continue-button').removeClass('hidden');
  });

  $('#continue-button').click(function() {
    var animal = $('.animal-wrapper.selected .animal')[0].id;
    window.location.href = '/scheduler?animal=' + animal;
  });
})();
