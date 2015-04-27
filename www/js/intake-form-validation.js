var validateForm = (function() {
    function _getQuestionFunction($question) {
      if ($question.hasClass('questiontype_short-text')) {
        return _validateShortText;
      }
      else if ($question.hasClass('questiontype_long-text')) {
        return _validateLongTextInput;
      }
      else if ($question.hasClass('questiontype_multi-text')) {
        return _validateMultiTextGrid;
      }
      else if ($question.hasClass('questiontype_checkbox')) {
        return _validateCheckboxInput;
      }
      else if ($question.hasClass('questiontype_radio')) {
        return _validateRadioInput;
      }
      else if ($question.hasClass('questiontype_yes-no')) {
        return _validateRadioInput;
      }
      else if ($question.hasClass('questiontype_yes-no-other')) {
        return _validateRadioInput;
      }
      else if ($question.hasClass('questiontype_dropdown')) {
        return _validateDropdown;
      }
      else if ($question.hasClass('questiontype_multi-select')) {
        return _validateCheckboxGrid;
      }
      else if ($question.hasClass('questiontype_dynamic-row')) {
        return _validateDynamicRow;
      }
      else {
        console.log("Error: question class doesn't exist");
        return null;
      }
    }

    function _validateShortText($question) {
      var $input = $question.find('.question-content');
      if ($input.val().length > 0) {
        return true;
      }
      return false;
    }

    function _validateLongTextInput($question) {
      var $input = $question.find('.question-content');
      if ($input.val().length > 0) {
        return true;
      }
      return false;
    }

    function _validateMultiTextGrid($question) {
      var $input = $question.find('.form_control');
      var isValidated = false;
      for (var i=0; i < $input.length; i++) {
        var $input_val = $input[i].val();
        if ($input_val.length > 0) {
          if (!$.isNumeric($input_val)) {
            return false;
          }
          isValidated = true;
        }
      }
      return isValidated;
    }

    function validateTextCheckboxOption($question) {
      var $text_input = $question.find('.has-text');
      for (var i=0; i < $text_input.length; i++) {
        console.log($text_input[i]);
        var $checkbox = $($text_input[i]).find('.question-input')[0];
        var $textbox = $($text_input[i]).find('.table-text')[0];
        var $isChecked = $($checkbox).prop('checked');
        var $hasText = ($($textbox).val().length > 0);
        if ($isChecked ? !$hasText : $hasText) {
          return false;
        }
      }
      return true;
    }

    function _validateCheckboxInput($question) {
      var $input = $question.find('.question-input');
      var isValidated = false;
      for (var i=0; i < $input.length; i++) {
        if ($($input[i]).prop('checked')) {
          isValidated = true;
        }
      }

      if (!isValidated) {
        return false;
      }
      if (!validateTextCheckboxOption($question)) {
        return false;
      }

      return true;
    }

    function _validateRadioInput($question) {
      var $input = $question.find('.question-input');
      var isValidRadio = false;
      for (var i=0; i < $input.length; i++) {
        if ($($input[i]).prop('checked')) {
          isValidRadio = true;
        }
      }
      if (!isValidRadio) {
        return false;
      }
      if (!validateTextCheckboxOption($question)) {
        return false;
      }
      return true;
    }

    function _validateDropdown($question) {
      return true;
    }

    function _validateCheckboxGrid($question) {
      var $rows = $question.find('tr');
      for (var i=0; i < $rows.length; i++) {
        var $checkboxes = $($rows[i]).find('.question-input');
        console.log($checkboxes);
        if (!($checkboxes.length === 0)) {
          var isValidRow = false;
          for (var j=0; j < $checkboxes.length; j++) {
            console.log($checkboxes[j]);
            if ($($checkboxes[j]).prop('checked')) {
              console.log("valid");
              isValidRow = true;
            }
          }
          if (!isValidRow) {
            return false;
          }
        }
      }
      if (!validateTextCheckboxOption($question)) {
        return false
      }
      return true;
    }

    function _validateDynamicRow($question) {
      var $rows = $question.find('.dynamic-row');
      if ($rows.length === 0) {
        return false;
      }
      for (var i=0; i<$rows.length; i++) {
        var $radios = $($rows[i]).find('.radio-col');
        for (var j=0; j<$radios.length; j++) {
          $checkedButtons = $radios.find("input:radio:checked");
          if ($checkedButtons.length === 0) {
            return false;
          }
        }
      }
      return true;
    }

    function displayErrors(invalidQuestions, curIndex, nextIndex) {
      if ((curIndex >= nextIndex) || (invalidQuestions.length === 0)){
        return;
      }
      else {
        for (var i=0; i<invalidQuestions.length; i++) {
          var $question = invalidQuestions[i];
          $($question).addClass('unanswered-question');
        }
        $('#error-box').show();
      }
    }

    function _validateForm(page, curIndex, nextIndex) {
      var $questions = $(page).find('.question');
      var invalidQuestions = [];
      $('#error-box').hide();
      for (var i=0; i < $questions.length; i++) {
        var $question = $($questions[i]);
        $($question).removeClass('unanswered-question');
        if (!$question.hasClass('is-optional')) {
          var isValidFn = _getQuestionFunction($question);
          if (isValidFn) {
            if (!isValidFn($question)) {
              invalidQuestions.push($question);
            }
          }
        }
      }
      displayErrors(invalidQuestions, curIndex, nextIndex);
      return (invalidQuestions.length === 0);
    }

    return _validateForm;
})();
