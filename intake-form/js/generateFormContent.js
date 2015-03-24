var generateFormContent = (function(){

    var _QUESTION_TYPE_GEN_MAP = {
        'short-text': _makeShortTextInput,
        'long-text': _makeLongTextInput,
        'multi-text': _makeMultiTextGrid,
        'radio': _makeRadioInput,
        'yes-no': _makeYesNoGenerator(false),
        'yes-no-other': _makeYesNoGenerator(true),
        'dropdown': _makeDropdown,
        // 'checkbox': _makeCheckboxInput,
        'multi-select': _makeCheckboxGrid
    };

    var QUESTION_TITLE_CLASS = 'question-title';
    var QUESTION_CONTENT_CLASS = 'question-content';
    var QUESTION_INPUT_CLASS = 'question-input';
    var PAGE_CLASS = 'page';
    var RADIO_OPTIONS_PER_ROW = 4;
    var CHECKBOX_OPTIONS_PER_ROW = 4;
    var ID_SEPARATOR = '__';

    function addCheckboxSuffix(text) {
        return text + ' (Select all that apply)';
    }

    function _makeEmptyQuestion(type) {
        var type = '_type_'+type;

        return $('<div>')
            .addClass('question form-group')
            .addClass(type);
    }

    function _makeQuestionTitleHeader(text) {
        return $('<label>').addClass(QUESTION_TITLE_CLASS).text(text);
    }

    function _makeGridCellId(gridId, rowId, colId) {
        return [gridId, rowId, colId].join(ID_SEPARATOR);
    }

    function _makeEmptyPage(pageIndex) {
        return $('<div>').addClass(PAGE_CLASS).attr('index', pageIndex);
    }

    function _makeDropdown(text, dropdownId, allData) {
        var $title = _makeQuestionTitleHeader(text)
            .addClass('control-label')
            .addClass('col-xs-5');

        var $optionWrapper = $('<div>').addClass('col-xs-4');
        var $dropdownSelect = $('<select>')
            .attr({
                id: dropdownId,
                name: dropdownId
            })
            .addClass('form-control')
            .appendTo($optionWrapper);

        var options = allData.options || [];
        for (var i=0; i < options.length; i++) {
            var optionData = options[i];
            var optText = optionData.value || '';
            var optId = optionData.id || '';

            var $option = $('<option>')
                .text(optText)
                .attr('value', optId);
            $dropdownSelect.append($option);
        }

        return [$title, $optionWrapper];
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

        var $content = $('<table>')
            .addClass(QUESTION_CONTENT_CLASS);

        var options = allData.options || [];
        var tableRowCells = [];
        for (var i=0; i < options.length; i++) {
            // There are four radios to each row of the table
            if (tableRowCells.length === RADIO_OPTIONS_PER_ROW) {
                $('<tr>')
                    .append(tableRowCells)
                    .appendTo($content);
                tableRowCells = [];
            }
            var optionData = options[i];
            // Compressed version that goes into the value attribute and is
            // used for id generation
            var optValueId = optionData.id || '';

            // What is printed in the option's label
            var optLabelText = optionData.value || '';

            // What id to give the input so that we can have labels
            // with a 'for' attribute
            var labelTargetId = ['optionfor', radioId, optValueId].join(ID_SEPARATOR);

            var $option = $('<td>').addClass('radio-box');

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
                .addClass('radio-label')
                .appendTo($option);

            var hasTextField = !!optionData.text_input;
            if (hasTextField) {
                var textFieldId = optionData.text_input_id || optValueId;
                textFieldId = [radioId, textFieldId].join(ID_SEPARATOR);

                var $textField = $('<input>')
                    .addClass(QUESTION_INPUT_CLASS)
                    .attr({
                        type: 'text',
                        name: textFieldId
                    })
                    .addClass('form-control')
                    .addClass('radio-text')
                    .appendTo($option);
            }
            tableRowCells.push($option);
        }
        $('<tr>')
            .append(tableRowCells)
            .appendTo($content);
        return [$title, $content];
    }

    function _makeShortTextInput(text, fieldId, allData) {
        var $title = _makeQuestionTitleHeader(text)
            .addClass('control-label')
            .addClass('col-xs-5');
        var $inputWrapper = $('<div>')
            .addClass('col-xs-4');
        var $input = $('<input>')
            .addClass(QUESTION_INPUT_CLASS)
            .addClass(QUESTION_CONTENT_CLASS)
            .addClass('form-control')
            .attr({
                type: 'text',
                name: fieldId
            });

        $inputWrapper.append($input);

        return [$title, $inputWrapper];
    }

    function _makeLongTextInput(text, fieldId, allData) {
        var $title = _makeQuestionTitleHeader(text)
            .addClass('control-label')
            .addClass('col-xs-5');
        var $inputWrapper = $('<div>')
            .addClass('col-xs-4');
        var $input = $('<textarea>')
            .addClass(QUESTION_INPUT_CLASS)
            .addClass(QUESTION_CONTENT_CLASS)
            .addClass('form-control')
            .attr({
                rows: 3,
                name: fieldId
            });

        $inputWrapper.append($input);

        return [$title, $inputWrapper];
    }


    function _makeGenericGrid(text, gridId, allData, callbacks) {
        var emptyFn = function(){};
        var postProcessRowLabel = callbacks.postProcessRowLabel || emptyFn;
        var postProcessColLabel = callbacks.postProcessColLabel || emptyFn;
        var postProcessDataCell = callbacks.postProcessDataCell || emptyFn;
        var makeCellContent = callbacks.makeCellContent || emptyFn;

        var $title = _makeQuestionTitleHeader(text);
        var rows = allData.rows || [];
        var cols = allData.columns || [];

        var $gridTable = $('<table>').addClass(QUESTION_CONTENT_CLASS);
        var $gridBody = $('<tbody>').appendTo($gridTable);

        var $headerRow = $('<tr>').appendTo($gridBody);
        // first, add empty cell so that we have space for row labels
        var $emptyCell = $('<th>');
        postProcessRowLabel($emptyCell);
        $headerRow.append($emptyCell);

        // create the remaining column labels
        for (var colIndex=0; colIndex < cols.length; colIndex++) {
            var colValue = cols[colIndex].value || '';
            var $colLabel = $('<th>').text(colValue);
            postProcessColLabel($colLabel);

            $headerRow.append($colLabel);
        }

        // create each input row of the table
        for (var rowIndex=0; rowIndex < rows.length; rowIndex++) {
            var rowData = rows[rowIndex];
            var rowValue = rowData.value || '';
            var rowId = rowData.id || '';
            var $gridRow = $('<tr>').appendTo($gridBody);
            var $rowHeader = $('<td>').text(rowValue);
            postProcessRowLabel($rowHeader);
            // add row label as first cell in the row
            $rowHeader.appendTo($gridRow);

            // create a text input for each cell
            for (var colIndex=0; colIndex < cols.length; colIndex++) {
                var colData = cols[colIndex];
                var colId = colData.id || '';
                var colValue = colData.value || '';

                var $gridCell = $('<td>')
                postProcessDataCell($gridCell);
                $gridCell.appendTo($gridRow);

                $gridCell.append(makeCellContent(
                    gridId, rowId, colId, rowValue, colValue
                ));
            }
        }

        return [$title, $gridTable];
    }

    function _makeMultiTextGrid(text, gridId, allData) {
        var callbacks = {
            postProcessRowLabel: function($label) {
                $label.addClass('multitext-row-header')
            },
            postProcessColLabel: function($label) {
                $label.addClass('multitext-col');
            },
            makeCellContent: function(gridId, rowId, colId, rowValue, colValue){
                var cellId = _makeGridCellId(gridId, rowId, colId);
                var $cellInput = $('<input>')
                    .addClass(QUESTION_INPUT_CLASS)
                    .attr({
                        type: 'text',
                        name: cellId
                    })
                    .addClass('form-control')
                    .addClass('multitext-box');
                return $cellInput;
            }
        };
        return _makeGenericGrid(text, gridId, allData, callbacks);        
    }

    function _makeCheckboxGrid(text, gridId, allData) {
        var text = addCheckboxSuffix(text);

        var callbacks = {
            postProcessRowLabel: function($label) {
                $label.addClass('multiselect-row');
            },
            postProcessColLabel: function($label) {
                $label.addClass('multiselect-col');
            },
            postProcessDataCell: function($cell) {
                $cell.addClass('multiselect-box');
            },
            makeCellContent: function(gridId, rowId, colId, rowValue, colValue){
                var cellId = _makeGridCellId(gridId, rowId, colId);
                var $cellInput = $('<input>')
                    .addClass(QUESTION_INPUT_CLASS)
                    .attr({
                        type: 'checkbox',
                        name: gridId,
                        id: cellId,
                        value: cellId
                    });
                return $cellInput;
            }
        };
        return _makeGenericGrid(text, gridId, allData, callbacks);         
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
