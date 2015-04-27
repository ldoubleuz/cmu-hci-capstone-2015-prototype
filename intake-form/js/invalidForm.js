var invalidForm = (function() {
  
  function _invalidForm($questions, currIndex, showIndex) {
    if (currIndex === showIndex) {
      return;
    }
    for (var i=0; i < $questions.length; i++) {
      $question = $questions[i];
      $($question).addClass('unanswered-question');
      $($question).removeClass('answered-question');
    }
  }

  return _invalidForm;
})