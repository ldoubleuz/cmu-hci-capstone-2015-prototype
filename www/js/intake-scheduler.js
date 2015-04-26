$(function() {
  var $calendar = $('#calendar'),
      $timesOfDay = $('#time-of-day li'),
      $confirmationCheckbox = $('#confirmation-checkbox-container'),
      $confirmationCheckmark = $('#confirmation-checkmark'),
      $continueButton = $('#continue-button'),
      $confirmation = $('#confirmation'),
      $selectedDate = $('#selected-date'),
      $selectedTimeAndDate = $('#selected-time-and-date');

  var blocked = {},
      maxMonthsAhead = 3;

  var BLOCKED_CLASS = 'disabled';


  // Unselect previously selected time. Disables blocked times on the selected date.
  function _dateSelected(dateText, context) {
    var time = $calendar.datepicker('getDate'),
        year = time.getFullYear(),
        month = time.getMonth(),
        date = time.getDate(),
        blockedTimesForDate = blocked[year]
          && blocked[year][month]
          && blocked[year][month][date];

    $timesOfDay.removeClass('selected').removeClass(BLOCKED_CLASS);
    $confirmation.addClass('hidden');

    if (blockedTimesForDate) {
      for (var hour = 9; hour < 16; hour++) {
        var blockedTimesForHour = blockedTimesForDate[hour] || {};
        if (blockedTimesForHour[0]) {
          $('#time-of-day-' + hour + '00').addClass(BLOCKED_CLASS);
        }
        if (blockedTimesForHour[30]) {
          $('#time-of-day-' + hour + '30').addClass(BLOCKED_CLASS);
        }
      }
    }
  }


  // Block the half hour begining at the given time.
  function _setBlockedHalfHour(time) {
    var year = time.getFullYear(),
        month = time.getMonth(),
        date = time.getDate(),
        hours = time.getHours(),
        minutes = time.getMinutes();

    if (blocked[year] === undefined) {
      blocked[year] = {};
    }
    if (blocked[year][month] === undefined) {
      blocked[year][month] = {};
    }
    if (blocked[year][month][date] === undefined) {
      blocked[year][month][date] = {};
    }
    if (blocked[year][month][date][hours] === undefined) {
      blocked[year][month][date][hours] = {};
    }

    blocked[year][month][date][hours][minutes] = true;
  }


  /**
   * Takes an array of blocked times of form:
   *  {start: milleseconds, end: milleseconds}
   * Parses times into half hour segments in which appointments can't be made.
   **/
  function _initCalendar(blockedTimes) {
    blockedTimes.forEach(function(blockedTime) {
      var start = new Date(blockedTime.start.dateTime),
          end = new Date(blockedTime.end.dateTime),
          current = new Date(blockedTime.start.dateTime);

      // Make current begin at the half hour before start.
      current.setMinutes(start.getMinutes() < 30 ? 0 : 30);

      while (current < end) {
        _setBlockedHalfHour(current);
        // Increase current by a half an hour (3000000 millesconds)
        current = new Date(current.getTime() + 3000000);
      }
    });

    $calendar.datepicker({
      altField: "#selected-date",
      onSelect: _dateSelected,
      dateFormat: "MM d, yy",
      minDate: 0,
      maxDate: '+' + maxMonthsAhead + 'm'
    });
  }


  // Update the UI with the selected time of day.
  $timesOfDay.click(function() {
    // Do nothing if clicked time was blocked
    if (this.classList.contains(BLOCKED_CLASS)) {
      return;
    }

    // Update text for selected time and date.
    var timeText = this.children[0].innerText,
        timeAndDateText = timeText + ' ' + $selectedDate.val();
    $selectedTimeAndDate.text(timeAndDateText);

    // Select the clicked time and unselect the previously selected time.
    $timesOfDay.removeClass('selected');
    this.classList.add('selected');

    // Hide the contineu button until the confirmation checkbox is clicked.
    $confirmation.removeClass('hidden');
    $confirmationCheckmark.addClass('hidden');
    $continueButton.addClass('hidden');
  });


  // Toggle whether the confirmation checkmark and continue button are hidden.
  $confirmationCheckbox.click(function() {
    $confirmationCheckmark.toggleClass('hidden');
    if (!$confirmationCheckmark.hasClass('hidden')) {
      $continueButton.removeClass('hidden');
    }
    else {
      $continueButton.addClass('hidden');
    }
  });


  // Create an appointment time and move onto intake form
  $continueButton.click(function() {
    var appointmentTime = new Date($selectedTimeAndDate.text());
    $.ajax({
      type: "POST",
      url: '/scheduler/add-event',
      data: {
        start: appointmentTime.toISOString(),
        duration: 30
      },
      error: function() {
        console.log('error');
        console.log(arguments);
      }
    });
  });


  (function init() {
    var today = new Date();
    $.ajax({
      url: '/scheduler/get-blocked-times',
      data: {
        month: today.getMonth(),
        year: today.getFullYear(),
        numMonths: maxMonthsAhead
      }
    }).success(_initCalendar);
  })();
});
