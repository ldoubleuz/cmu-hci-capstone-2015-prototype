$(function() {
  var dateSelected = function(dateText, context) {
    console.log(dateText, context);
  };

  var timesOfDay = $('#time-of-day li');

  $( "#calendar" ).datepicker({
    altField: "#selected-date",
    onSelect: dateSelected,
    dateFormat: "MM d, yy"
  });

  timesOfDay.click(function() {
    timesOfDay.removeClass('selected');
    this.classList.add('selected');
  });
});
