var generateFormContent = (function(){

    var _makeCheckboxInput = _inputTableFactory('checkbox');
    var _makeRadioInput = _inputTableFactory('radio');

    var _QUESTION_TYPE_GEN_MAP = {
        'short-text': _makeShortTextInput,
        'long-text': _makeLongTextInput,
        'multi-text': _makeMultiTextGrid,
        'checkbox': _makeCheckboxInput,
        'radio': _makeRadioInput,
        'yes-no': _makeYesNoGenerator(false),
        'yes-no-other': _makeYesNoGenerator(true),
        'dropdown': _makeDropdownQuestion,
        'multi-select': _makeCheckboxGrid,
        'dynamic-row': _generateDynamicRowControl
    };

    var QUESTION_TITLE_CLASS = 'question-title';
    var QUESTION_CONTENT_CLASS = 'question-content';
    var QUESTION_INPUT_CLASS = 'question-input';
    var PAGE_CLASS = 'page';
    var INLINE_OPTIONS_PER_ROW = 4;
    var ID_SEPARATOR = '__';

    function addCheckboxSuffix(text) {
        return text + ' (Select all that apply)';
    }

    function _makeEmptyQuestion(type) {
        type = 'questiontype_'+type;

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

    function _makeDynamicRowColLabel(text) {
        return $("<span>").text(text).addClass('dynamic-row-col-label');
    }

    function _generateDynamicRowTextCol(colText, uniqueId, colData) {
        var $colText = _makeDynamicRowColLabel(colText).addClass('text-col-label');
        var $input = $("<input>").attr({
            type: "text",
            name: uniqueId
        });
        return [$colText, $input];                
    }

    function _generateDynamicRowDropdownCol(colText, uniqueId, colData) {
        var $colText = _makeDynamicRowColLabel(colText).addClass('dropdown-col-label');
        var dropdownId = uniqueId;
        var options = colData.options || [];

        var $dropdownSelect = _makeDropdownSelectBox(dropdownId, options);

        return [$colText, $dropdownSelect];
    }

    function _generateDynamicRowRadioCol(colText, uniqueId, colData) {
        var $colText = _makeDynamicRowColLabel(colText).addClass('radio-col-label');
        var options = colData.options || [];

        var output = [$colText];

        for (var i=0; i < options.length; i++) {
            // TODO: This is almost identical to portions of the radio
            // input factory. We should abstract this to reduce code duplication

            var optionData = options[i];
            // Compressed version that goes into the value attribute and is
            // used for id generation
            var optValueId = optionData.id || '';

            // What is printed in the option's label
            var optLabelText = optionData.value || '';

            // What id to give the input so that we can have labels
            // with a 'for' attribute
            var labelTargetId = [
                'option', uniqueId, optValueId
            ].join(ID_SEPARATOR);

            var $option = $("<span>").addClass('radio-box');
            var $radioButton = $('<input>')
                .attr({
                    id: labelTargetId,
                    type: 'radio',
                    name: uniqueId,
                    value: optValueId
                });

            var $radioLabel = $("<label>")
                .attr('for', labelTargetId)
                .text(optLabelText);
                
            $option.append($radioButton);
            $option.append($radioLabel);

            output.push($option);
        }
        return output;
    }

    function _generateDynamicRow(parentId, colDataList, rowIndex) {
        var $row = $("<li>").addClass('dynamic-row');

        for (var colIndex=0; colIndex < colDataList.length; colIndex++) {
            var colData = colDataList[colIndex];
            var colType = colData.type;
            var colText = colData.text || '';
            var colId = colData.id || '';
            var uniqueId = [parentId, colId, ''+rowIndex].join("__");

            var generatorFn = null;
            if (colType == 'text') {
                generatorFn = _generateDynamicRowTextCol;
            } else if (colType == 'dropdown') {
                generatorFn = _generateDynamicRowDropdownCol;
            } else if (colType == 'radio') {
                generatorFn = _generateDynamicRowRadioCol;
            }

            var $column = generatorFn && 
                generatorFn(colText, uniqueId, colData);
            if ($column) {
                $row.append($column);
            }
        }

        return $row;
    }


    function _generateDynamicRowControl(text, id, data) {
        var $title = $("<h2>").addClass('title').text(text);
        var $container = $("<ol>").addClass('dynamic-row-container');

        var colDataList = data.columns || [];
        var numRows = 0;
        var _addRowFn = function() {
            $container.append(
                _generateDynamicRow(id, colDataList, numRows)
            );
            numRows++;
        };

        var $addButton = $("<button>")
            .text('Add new row')
            .addClass('dynamic-row-add-button');
        $addButton.click(function(e) {
            e.preventDefault();
            _addRowFn();
        });

        // Also populate with one empty row
        _addRowFn();

        return [$title, $container, $addButton];
    }

    function _makeDropdownSelectBox(dropdownId, options) {
        var $dropdownSelect = $('<select>')
            .attr({
                id: dropdownId,
                name: dropdownId
            })
            .addClass('form-control');

        for (var i=0; i < options.length; i++) {
            var optionData = options[i];
            var optText = optionData.value || '';
            var optId = optionData.id || '';

            var $option = $('<option>')
                .text(optText)
                .attr('value', optId);
            $dropdownSelect.append($option);
        }
        return $dropdownSelect;
    }

    function _makeDropdownQuestion(text, dropdownId, allData) {
        var $title = _makeQuestionTitleHeader(text)
            .addClass('control-label')
            .addClass('col-xs-5');

        var $optionWrapper = $('<div>')
            .addClass('col-xs-4')
            .addClass('col-xs-offset-1');

        var options = allData.options || [];
        var $dropdownSelect = _makeDropdownSelectBox(dropdownId, options);
        $optionWrapper.append($dropdownSelect);

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

    function _inputTableFactory(inputType) {
        return function (text, questionId, allData) {
            if (inputType === 'checkbox') {
                text = addCheckboxSuffix(text);
            }

            var $title = _makeQuestionTitleHeader(text);

            var $content = $('<table>').addClass(QUESTION_CONTENT_CLASS);
            var $tbody = $('<tbody>');

            var options = allData.options || [];
            var tableRowCells = [];
            for (var i=0; i < options.length; i++) {
                // There are four radios to each row of the table
                if (tableRowCells.length === INLINE_OPTIONS_PER_ROW) {
                    $('<tr>')
                        .append(tableRowCells)
                        .appendTo($tbody);
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
                var labelTargetId = [
                    'option', questionId, optValueId
                ].join(ID_SEPARATOR);

                var $option = $('<td>').addClass('radio-box');

                var $radioButton = $('<input>')
                    .addClass(QUESTION_INPUT_CLASS)
                    .attr({
                        id: labelTargetId,
                        type: inputType,
                        name: questionId,
                        value: optValueId
                    })
                    .appendTo($option);

                var $label = $('<label>')
                    .attr('for', labelTargetId)
                    .text(optLabelText)
                    .addClass('table-label')
                    .appendTo($option);

                var hasTextField = !!optionData.text_input;
                if (hasTextField) {
                    var textFieldId = optionData.text_input_id || optValueId;
                    textFieldId = [questionId, textFieldId].join(ID_SEPARATOR);

                    var $textField = $('<input>')
                        .addClass(QUESTION_INPUT_CLASS)
                        .attr({
                            type: 'text',
                            name: textFieldId
                        })
                        .addClass('form-control')
                        .addClass('table-text')
                        .appendTo($option);
                }
                tableRowCells.push($option);
            }
            // Append the remaining cells to the table
            $('<tr>')
                .append(tableRowCells)
                .appendTo($tbody);
            $content.append($tbody);
            return [$title, $content];
        };
    }

    function _makeShortTextInput(text, fieldId, allData) {
        var $title = _makeQuestionTitleHeader(text)
            .addClass('control-label')
            .addClass('col-xs-5');
        var $inputWrapper = $('<div>')
            .addClass('col-xs-4')
            .addClass('col-xs-offset-1');
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
            .addClass('col-xs-4')
            .addClass('col-xs-offset-1');
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
            var colLabel = cols[colIndex].value || '';
            var $colLabel = $('<th>').text(colLabel);
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
            for (colIndex=0; colIndex < cols.length; colIndex++) {
                var colData = cols[colIndex];
                var colId = colData.id || '';
                var colValue = colData.value || '';

                var $gridCell = $('<td>');
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
                $label.addClass('multitext-row-header');
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
        text = addCheckboxSuffix(text);

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

    function _generatePageContent(questionDataList, pageTitle, pageIndex) {
        var $page = _makeEmptyPage(pageIndex);
        var $title = $('<h2>')
                .text(pageTitle)
                .addClass('form-title');

        $page.append($title);

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
            var questionDataList = pagesData[i].questions;
            var pageTitle = pagesData[i].title;
            $pages.push(_generatePageContent(questionDataList, pageTitle, i));
        }
        return $pages;
    }

    return _generateFormContent;
})();
