/* jshint node: true */
var fs = require('fs'),
    mongoose = require('mongoose'),
    express = require('express'),
    bodyParser = require('body-parser');

var mongooseUrl = 'mongodb://localhost/test';
var serverPort = 3000;

mongoose.connect(mongooseUrl);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  console.log('MongoDB connection open at ' + mongooseUrl);
});

// How we plan to store info from the intake form
var intake = mongoose.model('intake', {

});

var app = express();
app.use(bodyParser)
   .get('/intake', function(req, res) {
      res.send('TODO: send the actual intake form');
    })
    .get('/intake/:animalType', function(req, res) {
      // TODO: send along the intake form that corresponds to the animal type
      res.send('TODO: send the actual intake form');
    })
    .post('/intake/:animalType', function(req, res) {
      var animalType = req.params.animalType,
          intakeQuestionsPath = 'intake_questions/' + animalType + '.json';

      fs.readFile(intakeQuestionsPath, 'utf8', function(err, data) {
        if (err) throw err;
        var questions = JSON.parse(data);
        // TODO: Use these questions to parse the form data into a formatted json
      });
    })
    .get('/interview/:id', function(req, res) {
      res.send('TODO: send the actual interview guide');
    });

var server = app.listen(serverPort, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
