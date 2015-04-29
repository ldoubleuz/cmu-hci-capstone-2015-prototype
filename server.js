/* jshint node: true */
var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    mongoose = require('mongoose'),
    express = require('express'),
    bodyParser = require('body-parser'),
    googleCalendarApiCalls = require('./google-calendar-api-calls'),
    answerParser = require('./intake-form-answer-parser'),
    moment = require('moment');

var mongooseUrl = 'mongodb://localhost/test';
var serverPort = 3000;

// Set up DB connections
mongoose.connect(mongooseUrl);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(callback) {
  console.log('MongoDB connection open at ' + mongooseUrl);
});

// How we plan to store info from the intake form
var intakeSchema = new mongoose.Schema({
  _id: String,
  information: Object
});
var Intake = mongoose.model('intake', intakeSchema);

// Set up Express Server
var app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static('./www'));
var server = app.listen(serverPort, 'localhost', 511, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('App server listening at http://%s:%s', host, port);
});


function sendServerError(res) {
  res.status(500).send('Server error');
}


app.get('/select-an-animal', function(req, res) {
  var file = 'intake-select-animal.html',
      options = {
        root: __dirname + '/www/'
      };
  res.sendFile(file, options);
});


app.get('/scheduler', function(req, res) {
  var file = 'intake-scheduler.html',
      options = {
        root: __dirname + '/www/'
      };
  res.sendFile(file, options);
});


/* Retrieve blocked timeslots for intake scheduler
 * Expects the followings params in GET:
 *  - startTime: a UTC string of when to start getting timeslots. Defaults to
 *      the UTC string of when the request is recieved.
 *  - endTime: a utc string of when to end getting timeslots. Defaults to
 *      the UTC string of 3 months after the request is recieved.
 * Returns list of blocked timeslots during the given period in the format:
 *  - [
 *      {
 *         start: an ISO string of the start time of the blocked slot,
 *         end: an ISO string of the end time of the blocked slot
 *      }
 *    ]
 */
app.get('/scheduler/get-blocked-times', function(req, res) {
  var startTime = moment.utc(req.query.startTime);
  if (!startTime.isValid()) {
    startTime = moment.utc();
  }

  var endTime = moment.utc(req.query.endTime);
  if (!endTime.isValid()) {
    endTime = moment.utc(startTime).add(3, 'months');
  }

  // Call google to fetch events on calendar within time period
  googleCalendarApiCalls.getBlockedTimes(startTime, endTime,
      function(blockedTimes) {
        return res.send(blockedTimes);
      },
      function() {
        sendServerError(res);
      }
  );
});


/* Send request to add a new tentative event to the google calendar
 * Events created by this API call are only tentative, and should be later
 * confirmed once the user submits the finished intake form
 *
 * Expects the following params in POST:
 * - start: an ISO timestamp of the start time
 * - minutes: the number of minutes the appointment should last for
 *             (we will use this to autogenerate an end time)
 *             (defaults to 30)
 * - userData: (optional) any additional user info to store in the description
 * Returns a JSON object with the following format:
 * {
 *   'success': true iff event was created,
 *   'event': A Google Calendar Event JSON object, with the following fields,
 *            (as listed in https://developers.google.com/google-apps/calendar/v3/reference/events)
 *    {
 *        id: The event's id,
 *       summary: The event's title,
 *       description: The event's description,
 *       start: {
 *          dateTime: RFC3391 string of the start time of the event
 *        },
 *       end: {
 *          dateTime: RFC3391 string of the end time of the event
 *        }
 *    }
 * }
 */
app.post('/scheduler/add-event', function(req, res) {
  // TODO: only send unconfirmed event to calendar and wait for user to finish
  // intake form before confirming event
  var startTime = req.body.start;
  startTime = startTime && moment(startTime);
  if (!startTime || !startTime.isValid()) {
    return res.status(403).send('Bad request');
  } else {
    startTime = startTime.toISOString();
  }

  var minutes = parseInt(req.body.minutes);
  if (!minutes || isNaN(minutes) || minutes <= 0) {
    minutes = 30; // default to half hour appointments
  }

  var endTime = moment(startTime).add(minutes, 'minutes').toISOString();

  var userId = req.body.userId || '';
  var description = util.format(
      'Auto-generated at %s\n\nUser ID: %s',
      moment().format('h:mm:ssa on MM-DD-YYYY'),
      userId
      );

  // Call Google API to insert an event
  googleCalendarApiCalls.addTentativeEvent(startTime, endTime, description,
      function(err, insertedEvent) {
        if (err) {
          console.log('Create event error:', err);
        } else {
          console.log(
              util.format(
              'Tentative %d-minute appointment added (starting at %s)',
              minutes,
              moment(startTime).format('h:mm:ssa, MM-DD-YYYY')));
        }
        res.send({
          success: !err,
          event: insertedEvent || null
        });
      },
      function() {
        sendServerError(res);
      }
  );
});


/* Confirms event by toggling event status from tentative to 'confirmed'
 *
 * Takes a single parameter:
 *   - id: The id of the Google Calendar Event to confirm (should have been
 *         generated by a prior insert API call)
 *
 * Returns in the same format as the insert API, with a status flag and
 * a Google Calendar event resource
 */
app.post('/scheduler/confirm-event', function(req, res) {
  var eventID = req.body.id;
  if (!eventID) {
    return res.status(403).send('Bad request ID');
  }
  googleCalendarApiCalls.confirmTentativeEvent(
      eventID,
      function(patchedEvent) {
        res.send({
          success: true,
          event: patchedEvent || null
        });
      },
      function(err) {
        res.send({
          success: false,
          event: null
        });
      },
      function() {
        sendServerError(res);
      }
  );
});


app.get('/intake', function(req, res) {
  var animal = req.query.animal;
  var file = 'intake-form-base.html',
      options = {
        root: __dirname + '/www/'
      };
  res.sendFile(file, options);
});


app.get('/get-intake-questions', function(req, res) {
  var animal = req.query.animal;
  var file = 'intake-questions/' + animal + '.json',
      options = {
        root: __dirname + '/www/'
      };
  // Validate that template file exists before sending it to client
  fs.stat(path.join(options.root, file), function(err, stats) {
    if (err || !stats.isFile()) {
      res.status(404).send(util.format('%s not found', file));
    } else {
      res.sendFile(file, options);
    }
  });
});


app.post('/intake', function(req, res) {
  console.log('TODO: handle submit');
  // The google calendar id of the associated event
  var eventID = req.body.id;

  var animalType = req.body.animalType,
      formFields = req.body.formFields || [],
      intakeQuestionsPath = 'intake_questions/' + animalType + '.json';

  var answers = answerParser.parse(formFields),
      intake = new Intake({
        _id: eventID,
        information: answers
      });

  var errorHandler = function(err) {
    console.log('Unable to confirm event', err);
    res.status(500).send('Unable to confirm event');
  };

  // TODO: redirect to selecting a different appointment if they've timed out
  googleCalendarApiCalls.confirmTentativeEvent(eventID,
      function(confirmedEvent) {
        intake.save(function(err) {
          if (err) return errorHandler(err);
          res.status(200).send('Confirmed');
        });
      }, errorHandler
  );
});


app.get('/interview', function(req, res) {
  var file = 'interview-guide.html',
      options = {
        root: __dirname + '/www/'
      };
  res.sendFile(file, options);
});


app.get('/get-interview-information', function(req, res) {
  var id = req.query.id;
  console.log(id);
  if (!id) {
    console.log('No id supplied when getting interview information');
    return res.status(400).send('No id supplied');
  }
  Intake.findById(id, function(err, found) {
    if (err) {
      console.log('No interview information found with id:', id);
      return res.status(404).send('No information found');
    }
    return res.send(found.information);
  });
});
