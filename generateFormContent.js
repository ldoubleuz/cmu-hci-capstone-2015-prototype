var generateFormContent = (function(){

    var _QUESTION_TYPE_GEN_MAP = {
        'short-text': _makeShortTextInput,
        'multi-text': _makeMultiTextGrid,
    };

    function _makeQuestionTitleHeader(text) {
        return $('<header>').addClass('question-title').text(text);
    }

    function _makeShortTextInput(text, fieldId, allData) {
        var $title = _makeQuestionTitleHeader(text);
        var $input = $('<input>').addClass('question-field short-text').attr({
            type: 'text',
            name: fieldId
        });

        return [$title, $input];
    }

    function _makeGridCellId(gridId, rowId, colId) {
        return [gridId, rowId, colId].join(',');
    } 

    function _makeMultiTextGrid(text, gridId, allData) {
        var $title = _makeQuestionTitleHeader(text);
        var rows = allData.rows || [];
        var cols = allData.columns || [];

        var $gridTable = $('<table>').addClass('grid');
        var $gridBody = $('<tbody>').appendTo($gridTable);

        var $headerRow = $('<tr>').appendTo($gridBody);
        // first, add empty cell so that we have space for row labels
        $headerRow.append($('<th>'));

        console.log(rows, cols);
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
                var $cellInput = $('<input>').attr({
                    type: 'text',
                    name: cellId
                }).appendTo($gridCell);
            }
        }

        return [$title, $gridTable];
    }

    function _makeEmptyQuestion() {
        return $('<div>').addClass('question form-group');
    }

    function _generateQuestionContent(questionData) {
        var $question = _makeEmptyQuestion();

        var type = questionData.type || 'short-text';
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

    function _makeEmptyPage(pageIndex) {
        return $('<div>').addClass('page').attr('index', pageIndex);
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