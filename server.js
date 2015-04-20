/* jshint node: true */
var fs = require('fs'),
    util = require('util'),
    mongoose = require('mongoose'),
    express = require('express'),
    bodyParser = require('body-parser'),
    google = require('googleapis'),
    moment = require('moment');

var mongooseUrl = 'mongodb://localhost/test';
var serverPort = 3000;

// Set up DB connections
mongoose.connect(mongooseUrl);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  console.log('MongoDB connection open at ' + mongooseUrl);
});

// Google calendar authentication info
var googleAPIKeys = require('./googleAPIKeys');
var googleCalendar = google.calendar('v3');
    oAuthClient = null, // To be setup by _initGoogleClient
    calendarIsAuthed = false,
    // what path the oauth request will automatically redirect to
    // (should match url set up in the Google API client)
    OAUTH_REDIRECT_PATH = '/admin/auth-calendar',
    // what path we should redirect to after a successful admin calendar oatuh
    OAUTH_SUCCESS_PATH = '/calendar-demo';

function _initGoogleClient() {
  var host = 'localhost';
  var port = serverPort;
  var redirectURL = util.format('http://%s:%s%s', host, port, OAUTH_REDIRECT_PATH);
  // Update global variable
  oAuthClient = new google.auth.OAuth2(
    googleAPIKeys.clientID, 
    googleAPIKeys.clientSecret, 
    redirectURL
  );
  console.log("google client initialized pointing at %s", redirectURL);
};

// TODO: setup sessions for a site admin, then call this before anything that
// should require an admin login
function shouldTriggerAuthAdmin(req, res) {
  return !(req.session && req.session.adminAuthed);
}

function doAuthAdmin(req, res) {
  if (shouldTriggerAuthAdmin(req, res)) {
    // TODO: do stuff to login a user
    throw new Exception("site admin auth not yet implemented");
  }
}

function shouldTriggerAuthCalendar(req, res) {
  return !calendarIsAuthed;
}

function doAuthCalendar(req, res) {
  if (shouldTriggerAuthCalendar(req, res)) {
    // trigger oauth flow
    // Generate an OAuth URL and redirect there
    var url = oAuthClient.generateAuthUrl({
      access_type: 'offline', // allows us to get a refresh token
      scope: 'https://www.googleapis.com/auth/calendar' // use write scope
    });
    res.redirect(url);
  }
}

// How we plan to store info from the intake form
var intake = mongoose.model('intake', {

});

var app = express();
app.use(bodyParser.urlencoded({extended: true}));

app.get('/calendar-demo', function(req, res) {
  if (shouldTriggerAuthCalendar(req, res)) {
    // trigger oauth flow
    doAuthCalendar(req, res);
  } else {
    // Stolen from http://www.matt-toigo.com/dev/pulling_google_calendar_events_with_node
    // Format today's date
    var today = moment().format('YYYY-MM-DD') + 'T';

    // Call google to fetch events for today on our calendar
    googleCalendar.events.list({
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
  var oAuthCode = req.param('code'); // Present if redirected from oauth
  if (oAuthCode) {
    // handle oauth response flow
    // Get an access token based on our OAuth code
    oAuthClient.getToken(oAuthCode, function(err, tokens) {
      if (err) {
        console.log('Error authenticating')
        console.log(err);
      } else {
        console.log('Successfully authenticated');
        console.log(tokens);
        
        // Store our credentials and redirect back to some page
        oAuthClient.setCredentials(tokens);
        calendarIsAuthed = true;
        res.redirect(OAUTH_SUCCESS_PATH);
      }
    });
  } else if (shouldTriggerAuthCalendar(req, res)) {
    doAuthCalendar(req, res);
  } else {
    // if already authenticated, skip oauth workflow
    res.redirect(OAUTH_SUCCESS_PATH);
  }
});

app.get('/intake', function(req, res) {
  res.send('TODO: send the actual intake form');
});

app.get('/intake/:animalType', function(req, res) {
  // TODO: send along the intake form that corresponds to the animal type
  res.send('TODO: send the actual intake form');
});

app.post('/intake/:animalType', function(req, res) {
  var animalType = req.params.animalType,
      intakeQuestionsPath = 'intake_questions/' + animalType + '.json';

  fs.readFile(intakeQuestionsPath, 'utf8', function(err, data) {
    if (err) throw err;
    var questions = JSON.parse(data);
    // TODO: Use these questions to parse the form data into a formatted json
  });
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
