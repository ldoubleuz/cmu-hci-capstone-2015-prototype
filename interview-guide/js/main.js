(function() {
    'use strict';
    var PETPOINT_URL = "https://sms.petpoint.com/sms3";

    $(document).ready(function() {
        $('.scroll-button.up').click(function() {
            $(this).parent()[0].scrollTop -= 190;
        });

        $('.scroll-button.down').click(function() {
            $(this).parent()[0].scrollTop += 190;
        });

        loadIntakeInfo();
        initPrintableTextareas();
        initSubmitButton();
    });

    function buildField(field) {
        var title = field.title || '';
        var value = field.value || '';

        var $field = $('<div>').addClass('intake-field');
        $field.append(
            $('<span>').addClass('name').text(title)
        );
        $field.append(
            $('<span>').addClass('value').text(value)
        );
        return $field;
    }

    function buildSection(section) {
        var title = section.title || '';
        var fields = section.fields || [];

        var $section = $('<div>').addClass('intake-section');
        $section.append(
            $('<h3>').addClass('section-title').text(title)
        );

        for (var i=0; i < fields.length; i++) {
            var $field = buildField(fields[i]);
            $section.append($field);
        }

        return $section;
    }

    function buildInfoHtml(data) {
        var sections = data.sections || [];
        var $container = $('#intake-information-generated-data');

        for (var i=0; i < sections.length; i++) {
            var $section = buildSection(sections[i]);
            $container.append($section);
        }
    }

    // add handler so that clicking submit moves sidebars around and adds 
    // a petpoint frame
    function initSubmitButton() {
        var $submit = $("#submit-button");

        $submit.on("click", function(e) {
            e.preventDefault();

            // Just opens a new tab with petpoint, since it has security options
            // that prevent us from loading it in an iframe
            window.open(PETPOINT_URL, "_blank");
        });
    }

    // Add print helpers that allow textareas to show overflow text when printed
    // Essentially just copies over textarea text into a hidden div that is
    // only shown when the page is printed.
    function initPrintableTextareas() {
        var $textareas = $("#interview-guide textarea");
        $textareas.each(function(_, textarea) {
            var $textarea = $(textarea);
            var $printHelper = $("<div>")
                .addClass("textarea-print-helper")
                .addClass("print-media-only");
            $printHelper.insertAfter($textarea);

            // Add callback to copy over text when updated (with proper
            // variable binding)
            var copyToHelper = function($textarea, $printHelper) {
                var curText = $textarea.val();
                return function() {
                    var newText = $textarea.val();
                    if (curText !== newText) {
                        curText = newText;

                        // Create paragraphs for each text line
                        $printHelper.empty();
                        var textLines = curText.split("\n");
                        for (var i=0; i < textLines.length; i++) {
                            var $line = $("<p>").text(textLines[i]);
                            $printHelper.append($line);
                        }
                    }
                };
            }($textarea, $printHelper);

            $textarea.on("input propertychange change keyup paste", copyToHelper);
        })
    }

    function loadIntakeInfo() {
        // TODO: replace this path with dynamic loading
        var filePath = 'interview-dummy.json';

        $.ajax({
            url: filePath,
            dataType: 'json',
            method: 'GET',
            success: buildInfoHtml,
            error: function() {
                console.log('error, intake info not built');
            }
        });
    }
})();
