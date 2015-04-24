$(function() {
  var $calendar = $('#calendar'),
      $timesOfDay = $('#time-of-day li'),
      $confirmationCheckbox = $('#confirmation-checkbox-container'),
      $confirmationCheckmark = $('#confirmation-checkmark'),
      $continueButton = $('#continue-button'),
      $confirmation = $('#confirmation'),
      $selectedDate = $('#selected-date'),
      $selectedTimeAndDate = $('#selected-time-and-date');

  function dateSelected(dateText, context) {
    $timesOfDay.removeClass('selected');
    $confirmation.addClass('hidden');
  }

  function initCalendar() {
    $calendar.datepicker({
      altField: "#selected-date",
      onSelect: dateSelected,
      dateFormat: "MM d, yy",
      minDate: 0
    });

    $timesOfDay.click(function() {
      var selectedTime = this.children[0].innerText,
          selectedDate = $selectedDate.val();
      $timesOfDay.removeClass('selected');
      this.classList.add('selected');
      $selectedTimeAndDate.text(selectedTime + ' on ' + selectedDate);
      $confirmation.removeClass('hidden');
      $confirmationCheckmark.addClass('hidden');
      $continueButton.addClass('hidden');
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
  }

  function init() {
    var today = new Date();
    $.ajax({
      url: '/scheduler/get-timeslots',
      method: 'GET',
      data: {
        month: today.getMonth(),
        year: today.getFullYear()
      }
    })
    .success(function(response) {
      console.log(response);
      initCalendar();
    });
  }

  init();
});
