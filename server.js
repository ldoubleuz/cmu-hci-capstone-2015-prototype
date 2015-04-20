/* jshint node: true */
var fs = require('fs'),
    util = require('util'),
    mongoose = require('mongoose'),
    express = require('express'),
    bodyParser = require('body-parser'),
    google = require('googleapis'),
    googleAPIKeys = require('./googleAPIKeys'),
    answerParser = require('./intake-form-answer-parser'),
    moment = require('moment');

var mongooseUrl = 'mongodb://localhost/test';
var serverPort = 3000;

// Google calendar authentication info
var calendar = google.calendar('v3'),
    oAuthClient = null, // To be setup by _initGoogleClient
    authedCalendar = false,
    OAUTH_REDIRECT_PATH = '/admin/auth-calendar';

var app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('./www'));

app.get('/calendar-demo', function(req, res) {
  if (!authedCalendar) {
    // trigger oauth flow
    // Generate an OAuth URL and redirect there
    var url = oAuthClient.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/calendar' // use write scope
    });
    res.redirect(url);
  } else {
    // Stolen from http://www.matt-toigo.com/dev/pulling_google_calendar_events_with_node
    // Format today's date
    var today = moment().format('YYYY-MM-DD') + 'T';

    // Call google to fetch events for today on our calendar
    calendar.events.list({
      calendarId: googleAPIKeys.calendarID,
      maxResults: 20,
      timeMin: today + '00:00:00.000Z',
      timeMax: today + '23:59:59.000Z',
      auth: oAuthClient
    }, function(err, events) {
      if(err) {
        console.log('Error fetching events');
        console.log(err);
      } else {

        // Send our JSON response back to the browser
        console.log('Successfully fetched events');
        res.send(events);
      }
    });
  }
});

app.get(OAUTH_REDIRECT_PATH, function(req, res) {
  var oAuthCode = req.query.code; // Present if redirected from oauth
  if (oAuthCode) {
    // handle oauth response flow
    // Get an access token based on our OAuth code
    oAuthClient.getToken(oAuthCode, function(err, tokens) {
      if (err) {
        console.log('Error authenticating');
        console.log(err);
      } else {
        console.log('Successfully authenticated');
        console.log(tokens);

        // Store our credentials and redirect back to our main page
        oAuthClient.setCredentials(tokens);
        authedCalendar = true;
        res.redirect('/calendar-demo');
      }
    });
  }
  else {
    res.redirect(OAUTH_REDIRECT_PATH);
  }
});

app.get('/intake/:animalType', function(req, res) {
  // TODO: send along the intake form that corresponds to the animal type
  var file = 'intake-form-' + req.params.animalType + '.html',
      options = {
        root: __dirname + '/www/'
      };
  res.sendFile(file, options);
});

app.post('/intake/:animalType', function(req, res) {
  var animalType = req.params.animalType,
      formBody = req.body,
      intakeQuestionsPath = 'intake_questions/' + animalType + '.json';

  var answers = answerParser.parse(formBody);
  /*fs.readFile(intakeQuestionsPath, 'utf8', function(err, data) {
    if (err) throw err;
    var output = [];
    var pages = JSON.parse(data).pages;
    pages.forEach(function(page) {
      var title = page.title,
          questions = page.questions;

      questions.map(function(questionObj) {
        var type = questionObj.type,
            question = questionObj.question,
            id = questionObj.id;

        return {
          question: question,
          answer: answer
        };
      });
    });
    // TODO: Use these questions to parse the form data into a formatted json
  });*/
});

app.get('/interview/:id', function(req, res) {
  res.send('TODO: send the actual interview guide');
});

var server = app.listen(serverPort, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
  _initGoogleClient();
});

// Set up DB connections
mongoose.connect(mongooseUrl);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  console.log('MongoDB connection open at ' + mongooseUrl);
});

function _initGoogleClient() {
  var host = server.address().address;
  var port = server.address().port;
  var redirectURL = util.format('http://%s:%s%s', host, port, OAUTH_REDIRECT_PATH);
  // Update global variable
  oAuthClient = new google.auth.OAuth2(
    googleAPIKeys.clientID,
    googleAPIKeys.clientSecret,
    redirectURL
  );
  console.log("google client initialized pointing at %s", redirectURL);
}


// How we plan to store info from the intake form
var intake = mongoose.model('intake', {

});
