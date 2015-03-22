(function() {
    'use strict';

    $(document).ready(function() {
        $('.scroll-button.up').click(function() {
            $(this).parent()[0].scrollTop -= 190;
        });

        $('.scroll-button.down').click(function() {
            $(this).parent()[0].scrollTop += 190;
        });

        loadIntakeInfo();
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
        var $container = $('#intake-information');

        for (var i=0; i < sections.length; i++) {
            var $section = buildSection(sections[i]);
            $container.append($section);
        }
    }

    function loadIntakeInfo() {
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
