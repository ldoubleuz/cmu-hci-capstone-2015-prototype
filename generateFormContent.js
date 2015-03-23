var generateFormContent = (function(){

    var _QUESTION_TYPE_GEN_MAP = {
        'short-text': _makeShortTextInput,
        'long-text': _makeLongTextInput,
        'multi-text': _makeMultiTextGrid,
        'radio': _makeRadioInput,
        'yes-no': _makeYesNoGenerator(false),
        'yes-no-other': _makeYesNoGenerator(true)
    };

    var QUESTION_TITLE_CLASS = 'question-title';
    var QUESTION_CONTENT_CLASS = 'question-content';
    var QUESTION_INPUT_CLASS = 'question-input';
    var PAGE_CLASS = 'page';

    function _makeEmptyQuestion(type) {
        return $('<div>')
            .addClass('question form-group')
            .addClass(type);
    }

    function _makeQuestionTitleHeader(text) {
        return $('<header>').addClass(QUESTION_TITLE_CLASS).text(text);
    }

    function _makeGridCellId(gridId, rowId, colId) {
        return [gridId, rowId, colId].join(',');
    } 

    function _makeEmptyPage(pageIndex) {
        return $('<div>').addClass(PAGE_CLASS).attr('index', pageIndex);
    }

    function _makeYesNoGenerator(includeOther) {
        return function(text, yesNoId, allData) {
            var options = [
                {id: 'yes', value: 'Yes'},
                {id: 'no', value: 'No'}
            ];
            if (includeOther) {
                options.push({
                    id: 'other',
                    value: 'Other',
                    text_input: true,
                    text_input_id: 'other'
                });
            }

            var radioData = {
                options: options
            };
            return _makeRadioInput(text, yesNoId, radioData);
        };
    }

    function _makeRadioInput(text, radioId, allData) {
        var $title = _makeQuestionTitleHeader(text);

        var $content = $('<div>').addClass(QUESTION_CONTENT_CLASS);

        var options = allData.options || [];
        for (var i=0; i < options.length; i++) {
            var optionData = options[i];
            // Compressed version that goes into the value attribute and is
            // used for id generation
            var optValueId = optionData.id || '';

            // What is printed in the option's label
            var optLabelText = optionData.value || '';

            // What id to give the input so that we can have labels 
            // with a 'for' attribute
            var labelTargetId = ['__option', radioId, optValueId].join('__');

            var $option = $('<div>').appendTo($content);

            var $radioButton = $('<input>')
                .addClass(QUESTION_INPUT_CLASS)
                .attr({
                    id: labelTargetId,
                    type: 'radio',
                    name: radioId,
                    value: optValueId
                })
                .appendTo($option);

            var $label = $('<label>')
                .attr('for', labelTargetId)
                .text(optLabelText)
                .appendTo($option);

            var hasTextField = !!optionData.text_input;
            if (hasTextField) {
                var textFieldId = optionData.text_input_id || '';
                textFieldId = [radioId, textFieldId].join('__');

                var $textField = $('<input>')
                    .addClass(QUESTION_INPUT_CLASS)
                    .attr({
                        type: 'text',
                        name: textFieldId
                    })
                    .appendTo($option);
            }
        }

        return [$title, $content];
    }

    function _makeShortTextInput(text, fieldId, allData) {
        var $title = _makeQuestionTitleHeader(text);
        var $input = $('<input>')
            .addClass(QUESTION_INPUT_CLASS)
            .addClass(QUESTION_CONTENT_CLASS)
            .attr({
                type: 'text',
                name: fieldId
            });

        return [$title, $input];
    }

    function _makeLongTextInput(text, fieldId, allData) {
        var $title = _makeQuestionTitleHeader(text);
        var $textarea = $('<textarea>')
            .addClass(QUESTION_INPUT_CLASS)
            .addClass(QUESTION_CONTENT_CLASS)
            .attr({
                name: fieldId
            });

        return [$title, $textarea];
    }

    function _makeMultiTextGrid(text, gridId, allData) {
        var $title = _makeQuestionTitleHeader(text);
        var rows = allData.rows || [];
        var cols = allData.columns || [];

        var $gridTable = $('<table>').addClass(QUESTION_CONTENT_CLASS);
        var $gridBody = $('<tbody>').appendTo($gridTable);

        var $headerRow = $('<tr>').appendTo($gridBody);
        // first, add empty cell so that we have space for row labels
        $headerRow.append($('<th>'));

        // create the remaining column labels
        for (var colIndex=0; colIndex < cols.length; colIndex++) {
            var colValue = cols[colIndex].value || '';
            $headerRow.append(
                $('<th>').text(colValue)
            );
        }

        // create each input row of the table 
        for (var rowIndex=0; rowIndex < rows.length; rowIndex++) {
            var rowData = rows[rowIndex];
            var rowValue = rowData.value || '';
            var rowId = rowData.id || '';
            var $gridRow = $('<tr>').appendTo($gridBody);  
            // add row label as first cell in the row
            $gridRow.append($('<td>').text(rowValue));

            // create a text input for each cell
            for (var colIndex=0; colIndex < cols.length; colIndex++) {
                var colData = cols[colIndex];
                var colId = colData.id || '';

                var cellId = _makeGridCellId(gridId, rowId, colId);
                var $gridCell = $('<td>').appendTo($gridRow);
                var $cellInput = $('<input>').addClass(QUESTION_INPUT_CLASS).attr({
                    type: 'text',
                    name: cellId
                }).appendTo($gridCell);
            }
        }

        return [$title, $gridTable];
    }

    function _generateQuestionContent(questionData) {
        var type = questionData.type || 'short-text';
        var $question = _makeEmptyQuestion(type);

        if (type in _QUESTION_TYPE_GEN_MAP) {
            var generatorFn = _QUESTION_TYPE_GEN_MAP[type];
            var text = questionData.question || '';
            var idName = questionData.id || '';

            $question.append(generatorFn(text, idName, questionData));
        } else {
            $question.append(
                $('<p>')
                    .text('error: ' + type + ' generator not implemented')
                    .css('color', 'red')
            );
        }
        return $question;
    }

    function _generatePageContent(questionDataList, pageIndex) {
        var $page = _makeEmptyPage(pageIndex);

        for (var i=0; i < questionDataList.length; i++) {
            var questionData = questionDataList[i];
            $page.append(_generateQuestionContent(questionData));
        }
        return $page;
    }

    function _generateFormContent(formData) {
        var pagesData = formData.pages || [];
        var $pages = [];
        for (var i=0; i < pagesData.length; i++) {
            var questionDataList = pagesData[i];
            $pages.push(_generatePageContent(questionDataList, i));
        }
        return $pages;
    }
        
    return _generateFormContent;
})();