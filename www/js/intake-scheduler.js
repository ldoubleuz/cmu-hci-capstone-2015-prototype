$(function() {
  var $calendar = $('#calendar'),
      $timesOfDay = $('#time-of-day li'),
      $confirmationCheckbox = $('#confirmation-checkbox-container'),
      $confirmationCheckmark = $('#confirmation-checkmark'),
      $continueButton = $('#continue-button'),
      $confirmation = $('#confirmation'),
      $selectedDate = $('#selected-date'),
      $selectedTimeAndDate = $('#selected-time-and-date');

  var selectedTime;

  $calendar.datepicker({
    altField: "#selected-date",
    onSelect: dateSelected,
    dateFormat: "MM d, yy",
    minDate: 0
  });

  $timesOfDay.click(function() {
    selectedTime = this.children[0].innerText;
    $timesOfDay.removeClass('selected');
    this.classList.add('selected');
    $selectedTimeAndDate.text(selectedTime + ' on ' + $selectedDate.val());
    $confirmationCheckmark.addClass('hidden');
    $continueButton.addClass('hidden');
    $confirmation.removeClass('hidden');
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

  $continueButton.click(function() {
    var date = $calendar.datepicker('getDate');
    var hours = Number(selectedTime.slice(0, selectedTime.indexOf(':')));
    if (selectedTime.indexOf('PM') !== -1) {
      hours += 12;
    }
    var minutes = selectedTime.indexOf('30') === -1 ? 0 : 30;
    date.setHours(hours);
    date.setMinutes(minutes);
    $.ajax({
      url: '/scheduler/add-event',
      type: 'POST',
      data: {
        start: date.toISOString(),
        duration: 30
      },
      success: function(data){
        console.log('success?');
        console.log(data);
      },
      error: function() {
        console.log('error');
        console.log(arguments);
      }
    });
  });

  function dateSelected(dateText, context) {
    $timesOfDay.removeClass('selected');
    $confirmation.addClass('hidden');
  }

  function initCalendar() {

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
