var ValidateForm = (function() {
    var _QUESTION_TYPE_GEN_MAP = {
      'short-text': _validateShortText,
      'long-text': _validateLongTextInput,
      'multi-text': _validateMultiTextGrid,
      'checkbox': _validateCheckboxInput,
      'radio': _validateRadioInput,
      'yes-no': _validateRadioInput,
      'yes-no-other': _validateRadioInput,
      'dropdown': _validateDropdown,
      'multi-select': _validateCheckboxGrid
    };

    function _validateShortText($question) {
      var $input = $question.find('form_control')[0];
      if ($input.val().length > 0) {
        return (true, '');
      }
      return (false, 'Please fill out this question before continuing');
    }

    function _validateLongTextInput($question) {
      var $input = $question.find('form_control')[0];
      if ($input.val().length > 0) {
        return (true, '');
      }
      return (false, 'Please fill out this question before continuing');
    }

    function _validateMultiTextGrid($question) {
      var $input = $question.find('form_control');
      var isValidated = false;
      for (var i=0; i < $input.length; i++) {
        var $input_val = $input[i].val();
        if ($input_val.length > 0) {
          if (!$.isNumeric($input_val)) {
            return (false, 'Please fill out a number')
          }
          isValidated = true;
        }
      }
      if (isValidated) {
        return (true, '');
      }
      return (false, 'Please fill out this question before continuing');
    }

    function _validateCheckboxInput($question) {
      var $input = $question.find('question-input');
      var isValidated = false;
      for (var i=0; i < $input.length; i++) {
        if ($input[i].prop('checked')) {
          isValidated = true;
        }
      }

      if (!isValidated) {
        return (false, 'Please check an option (or None if none apply)';
      }

      if !validateTextCheckboxOption($question) {
        return (false, 'Please fill out both the textbox and checkbox');;
      }

      return true;
    }

    function _validateRadioInput($question) {
      var $input = $question.find('question-input');
      for (var i=0; i < $input.length; i++) {
        if ($input[i].prop('checked')) {
          if (validateTextCheckboxOption($question)) {
            return (true, '');
          }
          return (false, 'Please fill out both the textbox and radiobutton');
        }
      }
      return false;
    }

    function _validateDropdown($question) {
      return (true, '');
    }

    function _validateCheckboxGrid($question) {
      
    }

    function validateTextCheckboxOption($question) {
      var $text_input = $question.find('has_text');
      for (var i=0; i < $text_input.length; i++) {
        var $checkbox = $text_input[i].find('question-input')[0];
        var $textbox = $text_input[i].find('table-text')[0];
        var $isChecked = $checkbox.prop('checked');
        var $hasText = ($textbox.val().length > 0);
        if ($isChecked ? !$hasText : $hasText) {
          return false;
        }
      }
      return true;
    }

    function _validateForm($page) {
      var $questions = $page.children('.question');
      for (var i=0; i < $questions.length; i++) {
        var $question = $($questions[i]);
        if (!$question.hasClass('is-optional')) {
          var type = questionData.type || 'short-text';
          if (type in _QUESTION_TYPE_GEN_MAP) {
            var (isValidFn, validString) = _QUESTION_TYPE_GEN_MAP[type];
            if (!isValidFn($question)) {
              return false;
            }
          }
        }
      }
      return true;
    }


})();