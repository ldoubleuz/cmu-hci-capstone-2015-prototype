$(function() {
  var $calendar = $('#calendar'),
      $timesOfDay = $('#time-of-day li'),
      $selectedDate = $('#selected-date'),
      $selectedTimeAndDate = $('#selected-time-and-date'),
      $confirmation = $('#confirmation'),
      $confirmationCheckbox = $('#confirmation-checkbox-container'),
      $confirmationCheckmark = $('#confirmation-checkmark'),
      $continueButton = $('#continue-button');

  var blocked = {},
      maxMonthsAhead = 3;

  var BLOCKED_CLASS = 'disabled',
      SELECTED_CLASS = 'selected',
      HIDDEN_CLASS = 'hidden',
      OPENING_HOUR = 10,
      CLOSING_HOUR = 15;

  // Unselect previously selected time. Disables blocked times on the selected date.
  function _dateSelected() {
    var time = $calendar.datepicker('getDate'),
        year = time.getFullYear(),
        month = time.getMonth(),
        date = time.getDate(),
        blockedTimesForDate =
            blocked[year] &&
            blocked[year][month] &&
            blocked[year][month][date];

    $timesOfDay
      .removeClass(SELECTED_CLASS)
      .removeClass(BLOCKED_CLASS);
    $confirmation
      .addClass(HIDDEN_CLASS);

    if (blockedTimesForDate) {
      for (var hour = OPENING_HOUR; hour < CLOSING_HOUR; hour++) {
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


  // Block the appointment slot begining at the given time.
  function _blockAppointmentTime(appointmentTime) {
    var year = appointmentTime.getFullYear(),
        month = appointmentTime.getMonth(),
        date = appointmentTime.getDate(),
        hours = appointmentTime.getHours(),
        minutes = appointmentTime.getMinutes();

    blocked[year] = blocked[year] || {};
    blocked[year][month] = blocked[year][month] || {};
    blocked[year][month][date] = blocked[year][month][date] || {};
    blocked[year][month][date][hours] = blocked[year][month][date][hours] || {};

    blocked[year][month][date][hours][minutes] = true;
  }


  /**
   * Takes an array of blocked times of form: {
   *   start: { dateTime: milleseconds },
   *   end: { dateTime: milleseconds }
   * }
   * And blocks appointments slots that occur during those times.
   **/
  function _initCalendar(blockedTimes) {
    var todaysOpening = new Date();
    todaysOpening.setHours(OPENING_HOUR);
    var now = new Date();

    // Block off appointment slots that have already passed today.
    if (todaysOpening < now) {
      blockedTimes.push({
        start: { dateTime: todaysOpening.toISOString()},
        end: { dateTime: now.toISOString()}
      });
    }

    blockedTimes.forEach(function(blockedTime) {
      var endBlockedTime = new Date(blockedTime.end.dateTime),
          appointmentTime = new Date(blockedTime.start.dateTime);

      appointmentTime.setMinutes(
        appointmentTime.getMinutes() < 30 ? 0 : 30
      );

      while (appointmentTime < endBlockedTime) {
        _blockAppointmentTime(appointmentTime);
        // Increase current by a half an hour
        appointmentTime = new Date(appointmentTime.getTime() + 30 * 60000);
      }
    });

    $calendar.datepicker({
      altField: '#selected-date',
      onSelect: _dateSelected,
      dateFormat: 'MM d, yy',
      // If its past closing time, scheduling starts tomorrow
      minDate: now.getHours() < CLOSING_HOUR ? 0 : 1,
      maxDate: '+' + maxMonthsAhead + 'm'
    });

    _dateSelected();
  }


  // Update the UI with the selected time of day.
  $timesOfDay.click(function() {
    // Do nothing if clicked time was blocked
    if (this.classList.contains(BLOCKED_CLASS)) {
      return;
    }

    // Update text for selected time and date.
    var timeText = $(this.children[0]).text(),
        timeAndDateText = timeText + ' ' + $selectedDate.val();
    $selectedTimeAndDate.text(timeAndDateText);

    // Select the clicked time and unselect the previously selected time.
    $timesOfDay.removeClass(SELECTED_CLASS);
    this.classList.add(SELECTED_CLASS);

    // Hide the contineu button until the confirmation checkbox is clicked.
    $confirmation.removeClass(HIDDEN_CLASS);
    $confirmationCheckmark.addClass(HIDDEN_CLASS);
    $continueButton.addClass(HIDDEN_CLASS);
  });


  // Toggle whether the confirmation checkmark and continue button are hidden.
  $confirmationCheckbox.click(function() {
    $confirmationCheckmark.toggleClass(HIDDEN_CLASS);
    if (!$confirmationCheckmark.hasClass(HIDDEN_CLASS)) {
      $continueButton.removeClass(HIDDEN_CLASS);
    }
    else {
      $continueButton.addClass(HIDDEN_CLASS);
    }
  });


  // Create an appointment time and move onto intake form
  $continueButton.click(function() {
    var time = $('#time-of-day li.selected div').text(),
        hours = Number(time.slice(0, time.indexOf(':'))),
        minutes = time.indexOf('30') === -1 ? 0 : 30,
        appointment = $calendar.datepicker('getDate');

    if (time.indexOf('PM') !== -1) {
      hours += 12;
    }
    appointment.setHours(hours);
    appointment.setMinutes(minutes);

    $.ajax({
      type: 'POST',
      url: '/scheduler/add-event',
      data: {
        start: appointment.toISOString(),
        minutes: 30
      },
      success: function(data) {
        if (data.success) {
          // On successful event creation, send the user to the intake form
          var oldQueryParams = $.getQueryParameters() || {};
          var newQueryParams = {
            'id': data.event.id
          };
          if (oldQueryParams.hasOwnProperty('animal')) {
            newQueryParams.animal = oldQueryParams.animal;
          }
          window.location = '/intake?' + $.param(newQueryParams);
        }
      },
      error: function() {
        console.log('error', arguments);
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
