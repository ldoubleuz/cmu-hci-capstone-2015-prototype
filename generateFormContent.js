var generateFormContent = (function(){

    var _QUESTION_TYPE_GEN_MAP = {
        'short-text': _makeShortTextInput
    };

    function _makeShortTextInput(text, fieldName, options) {
        var value = options.value || '';

        var $title = $('<header>').addClass('question-title').text(text);
        var $input = $('<input>').addClass('question-field short-text').attr({
            type: 'text',
            name: fieldName,
            value: value
        });

        return [$title, $input];
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
            var fieldName = questionData.id || '';
            var options = questionData.options || {};

            $question.append(generatorFn(text, fieldName, options));
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