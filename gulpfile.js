var gulp = require('gulp'),
    fs = require('fs'),
    jsdom = require('jsdom').jsdom,
    jquery = require('jquery'),
    intakeFormGenerator = require('./intake-form-generator.js');

var intakeQuestionsDir = './intake_questions/';
var intakeFormSkeletonPath = './intake-form-skeleton.html';

gulp.task('default', function() {
    console.log('gulp update-intake-forms: Generates intake forms from questions in intake_questions');
});

gulp.task('update-intake-forms', function() {
    // Get all the jsons with questions used to generate intake-forms
    var intakeFormSkeleton = fs.readFileSync(intakeFormSkeletonPath);
    var files = fs.readdirSync(intakeQuestionsDir);

    files.forEach(function(fileName) {
        if (fileName.indexOf('.json') === -1) { return; }

        var questionsPath = intakeQuestionsDir + fileName,
            questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

        var animalName = fileName.slice(0, fileName.lastIndexOf('.json')),
            outputFile = 'www/intake-form-' + animalName + '.html';

        var document = jsdom(intakeFormSkeleton),
            $ = jquery(document.parentWindow),
            $body = $(document.body);

        var formTitle = animalName.charAt(0).toUpperCase() + animalName.slice(1) + ' Surrender Form',
            formContent = intakeFormGenerator.generateFormContent($, questions);

        $body.find('#title').text(formTitle);
        $body.find('#dynamic-content').append(formContent);

        fs.writeFileSync(outputFile, document.documentElement.innerHTML);
    });
});
