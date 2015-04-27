/* jshint node: true */
var fs = require('fs'),
    path = require('path'),
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
var googleCalendar = google.calendar('v3');
var googleAuthClient = null; // To be setup by _initGoogleClient
// What fields google calendar event resources returned by api calls should have
var RETURNED_EVENT_FIELDS = 'description,summary,start,end,id,status,created';
// How long to block off an unconfirmed intake appointment event timeslot before
// freeing it back up for other users
var TENTATIVE_EVENT_TIMEOUT = moment.duration(1, 'day');

var app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static('./www'));

app.get('/scheduler', function(req, res) {
  var file = 'intake-scheduler.html',
      options = {
        root: __dirname + '/www/'
      };
  res.sendFile(file, options);
});

function deleteEvent(eventID, onSuccess, onError) {
  googleCalendar.events.delete({
    calendarId: googleAPIKeys.calendarID,
    eventId: eventID,
    auth: googleAuthClient
  }, function(err) {
    if (err) {
      console.log('error while deleting event', eventID, err);
      if (onError) {
        onError(err);
      }
    } else {
      console.log('deleted event', eventID);
      if (onSuccess) {
        onSuccess();
      }
    }
  });
}

function combineOverlappingItems(eventItems) {
  var combinedItems = [];
  if (eventItems.length > 0) {
    var currentStart = eventItems[0].start,
        currentEnd = eventItems[0].end;
    for (i = 1; i < eventItems.length; i++) {
      var item = eventItems[i];
      if (item.start < currentEnd) {
        currentEnd = Math.max(currentEnd, item.end);
      }
      else {
        combinedItems.push({start: currentStart, end: currentEnd});
        currentStart = item.start;
        currentEnd = item.end;
      }
    }
    combinedItems.push({start: currentStart, end: currentEnd});
  }
  return combinedItems;
}

/* Retrieve available timeslots for intake scheduler
 * Expects the followings params in GET:
 *  - month: a number between 0 and 11 representing the month that starts the
 *            the timeperiod of events we are retrieving
 *  - year: a number representing the year to retrieve, defaults to current year
 *  - numMonths: The number of months to retrieve, starting at the specified
 *      date. Must be strictly positive, defaults to 1
 * Returns list of blocked timeslots during the given period in the format:
 *  - [
 *      {
 *         start: an ISO string of the start time of the blocked slot,
 *         end: an ISO string of the end time of the blocked slot
 *      }
 *    ]
 */
app.get('/scheduler/get-blocked-times', function(req, res) {
  var now = moment();
  var month = req.query.month && parseInt(req.query.month);
  if (!month || isNaN(month) || month < 0 || month > 11) {
    month = now.month();
  }

  var numMonths = req.query.numMonths && parseInt(req.query.numMonths);
  if (!numMonths || isNaN(numMonths)) {
    numMonths = 1;
  }

  var year = req.query.year && parseInt(req.query.year);
  if (!year || isNaN(year)) {
    year = now.year();
  }

  var startTime = moment.utc([year, month]);
  if (!startTime.isValid()) {
    startTime = moment.utc([now.year(), now.month()]);
  }

  var endTime = moment.utc(startTime).add(numMonths, 'months').startOf('month');

  // Call google to fetch events on calendar within time period
  googleCalendar.events.list({
    calendarId: googleAPIKeys.calendarID,
    timeMin: startTime.toISOString(),
    timeMax: endTime.toISOString(),
    singleEvents: true, // split recurring events into single events
    auth: googleAuthClient
  },
  // Retrieve calendar events and convert to output format
  function(err, data) {
    if (err) {
      console.log('Error fetching events', err);
      return res.status(500).send('Server error while fetching calendar');
    }

    var eventItems = data.items;
    // Delete any events that are still tentative and should be timed out.
    eventItems.filter(function(item) {
      if (item.status === 'tentative' &&
          moment(moment(item.created) + TENTATIVE_EVENT_TIMEOUT) < now) {
        deleteEvent(item.id);
        return false;
      }
      return true;
    }).map(function(item) {
      return {
        start: new Date(item.start),
        end: new Date(item.end)
      };
    });

    var outputItems = combineOverlappingItems(eventItems);

    return res.send(outputItems);
  });
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
    res.status(403).send('Bad request');
    return;
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
  googleCalendar.events.insert({
    calendarId: googleAPIKeys.calendarID,
    // Make sure to wrap Event objects in a 'resource' dictionary
    resource: {
      end: { dateTime: endTime },
      start: { dateTime: startTime },
      status: 'tentative',
      summary: '[Tentative] Intake appointment',
      description: description
    },
    // What fields to return from the created event
    fields: RETURNED_EVENT_FIELDS,
    auth: googleAuthClient
  }, function(err, insertedEvent) {
    var success = false;
    var outputEvent = null;
    if (err) {
      console.log('Create event error:', err);
    } else {
      console.log(util.format(
          'Tentative %d-minute appointment added (starting at %s)',
          minutes,
          moment(startTime).format('h:mm:ssa, MM-DD-YYYY')
          ));
      success = true;
      outputEvent = insertedEvent;
    }
    res.send({
      'success': success,
      'event': outputEvent
    });
  });
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
  googleCalendar.events.patch({
    'calendarId': googleAPIKeys.calendarID,
    'eventId': eventID,
    'resource': {
      'status': 'confirmed',
      'summary': '[Confirmed] Intake appointment'
    },
    'fields': RETURNED_EVENT_FIELDS,
    'auth': googleAuthClient
  }, function(err, patchedEvent) {
    if (err) {
      console.log('Error while patching event: ' + eventID, err);
    }
    return res.send({
      success: !err,
      event: outputEvent || null
    });
  });
});

app.get('/intake', function(req, res) {
  var animal = req.query.animal;
  var file = 'intake-form-' + animal + '.html',
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
  var animalType = req.query.animalType,
      formBody = req.body,
      intakeQuestionsPath = 'intake_questions/' + animalType + '.json';

  // TODO: store answers with eventID in database.
  var answers = answerParser.parse(formBody);
});

app.get('/interview/:id', function(req, res) {
  res.send('TODO: send the actual interview guide');
});


function _initGoogleClient(onSuccess, onError) {
  console.log('authorizing Google service account...');
  googleAuthClient = new google.auth.JWT(
      googleAPIKeys.serviceAccountEmail,
      googleAPIKeys.serviceKeyPath,
      null,
      // calendar write scope
      ['https://www.googleapis.com/auth/calendar']);

  googleAuthClient.authorize(function(err, tokens) {
    if (err && onError) {
      onError(err);
    } else if (onSuccess) {
      onSuccess(tokens);
    }
  });
}

var server = null;
function startServer() {
  // wait for Google client to authorize service account before starting server
  _initGoogleClient(function() {
    server = app.listen(serverPort, 'localhost', 511, function() {
      var host = server.address().address;
      var port = server.address().port;

      console.log('App server listening at http://%s:%s', host, port);
    });
  }, function(err) {
    console.log('failed to authorize Google service account');
    console.log(err);
  });
}

startServer();

// Set up DB connections
mongoose.connect(mongooseUrl);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(callback) {
  console.log('MongoDB connection open at ' + mongooseUrl);
});

// How we plan to store info from the intake form
var intake = mongoose.model('intake', {

});
