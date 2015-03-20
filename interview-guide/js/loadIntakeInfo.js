function buildSection(section) {
    var title = section.title || '';
    var fields = section.fields || [];
}

function buildInfoHtml(data) {
    var sections = data.sections;
    for (var i=0; i < sections.length; i++) {
        buildSection(sections[i]);
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
    })
}