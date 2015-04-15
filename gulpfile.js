var gulp = require('gulp'),
    fs = require('fs'),
    jsdom = require('jsdom').jsdom,
    jquery = require('jquery'),
    intakeFormGenerator = require('./intake-form-generator.js');

var intakeQuestionsDir= './intake_questions/';
var intakeFormSkeletonPath = 'intake-form-skeleton.html';

gulp.task('default', function() {
  console.log('TODO: write useful info to console');
});

gulp.task('update-intake-forms', function() {
  // Get all the jsons with questions used to generate intake-forms
  var intakeFormSkeleton = fs.readFileSync(intakeFormSkeletonPath);
  fs.readdir(intakeQuestionsDir, function(err, files) {
    if (err) return console.error(err);
    files.forEach(function(fileName) {
      var filePath = intakeQuestionsDir + fileName,
          animalName = fileName.slice(0, fileName.lastIndexOf('.json')),
          outputFile = 'www/intake-form-' + animalName + '.html';
      if (filePath.indexOf('.json') === -1) {
        return;
      }

      fs.readFile(filePath, 'utf8', function(err, data) {
        if (err) return console.error(err);
        var questions = JSON.parse(data),
            document = jsdom(intakeFormSkeleton),
            $ = jquery(document.parentWindow),
            $body = $(document.body);
            formContent = intakeFormGenerator.generateFormContent($, questions);

        var title = animalName.charAt(0).toUpperCase() + animalName.slice(1) + ' Surrender Form';
        $body.find('#title').text(title);
        $body.find('#dynamic-content').append(formContent);

        fs.writeFile(outputFile, document.documentElement.innerHTML, function(err) {
          if(err) {
              return console.error(err);
          }
          console.log("Created file: " + outputFile);
        });
      });
    });
  });
});
