$(function() {
  var $calendar = $('#calendar'),
      $timesOfDay = $('#time-of-day li'),
      $confirmationCheckbox = $('#confirmation-checkbox-container'),
      $confirmationCheckmark = $('#confirmation-checkmark'),
      $continueButton = $('#continue-button');

  function dateSelected(dateText, context) {
    $timesOfDay.removeClass('selected');
  }

  $calendar.datepicker({
    altField: "#selected-date",
    onSelect: dateSelected,
    dateFormat: "MM d, yy"
  });

  $timesOfDay.click(function() {
    $timesOfDay.removeClass('selected');
    this.classList.add('selected');
  });

  $confirmationCheckbox.click(function() {
    $confirmationCheckmark.toggleClass('hidden');
    if (!$confirmationCheckmark.hasClass('hidden')) {
      $continueButton.removeClass('hidden');
    }
    else {
      $continueButton.addClass('hidden');
    }
  });
});
