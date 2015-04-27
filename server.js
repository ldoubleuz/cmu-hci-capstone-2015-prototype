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
var googleAuthClient = null; // To be setup by authNewGoogleClient
// What fields google calendar event resources returned by api calls should have
var RETURNED_EVENT_FIELDS = 'description,summary,start,end,id,status,created';
// How long to block off an unconfirmed intake appointment event timeslot before
// freeing it back up for other users
var TENTATIVE_EVENT_TIMEOUT = moment.duration(12, 'hours');

var app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static('./www'));

// Wrapper function for any google API call, in order to automatically refresh
// the authclient when the accesstoken expires. Takes the api function to call,
// the input data that would have been passed to the api call, and the callback
// function that would be handled during the api response.
function googleApiWithAuthRefresh(apiFn, inputData, callbackFn, onFailedAuth) {
  var apiAttempts = 0;
  var maxAttempts = 4;

  function _attemptReauth() {
    authNewGoogleClient(
      function(){_attemptApiCall(false)}, 
      function(){_attemptApiCall(true)}
    );
  }

  function _attemptApiCall(justFailedAuthAttempt) {
    if (apiAttempts >= maxAttempts) {
      console.log("unable to reauthorize client, giving up...");
      onFailedAuth && onFailedAuth();
      return;
    }

    apiAttempts++;
    if (justFailedAuthAttempt || (!googleAuthClient)) {
      // Skip straight to auth attempt to get a working client before moving 
      // to original api call
      _attemptReauth();
    } else {
      // Rebuild input, since the googleAuthClient variable may have been
      // changed by a reauth attempt
      var localInput = {};
      for (key in inputData)  {
        if (key === 'auth') {
          localInput.auth = googleAuthClient;
        } else {
          localInput[key] = inputData[key];
        }
      }

      apiFn(localInput, function(err, response) {
        // Automatically refresh auth client and retry original api call
        // if auth client is unauthorized
        if (err && err.code === 401) {
          _attemptReauth();
        } else {
          // If authclient didn't fail due to authorization error, 
          // proceed with api call as normal (note that we may still have 
          // failed for non-auth reasons)
          callbackFn && callbackFn(err, response);
        }
      });
    }
  }
  _attemptApiCall(false);
}

function sendServerError(res) {
  res.status(500).send('Server error');
}

app.get('/calendar-hello-world', function(req, res) {
  // Stolen from http://www.matt-toigo.com/dev/pulling_google_calendar_events_with_node
  // Format today's date
  var today = moment().format('YYYY-MM-DD') + 'T';

  // Call google to fetch events for today on our calendar
  googleApiWithAuthRefresh(
    googleCalendar.events.list, {
      calendarId: googleAPIKeys.calendarID,
      maxResults: 20,
      timeMin: today + '00:00:00.000Z',
      timeMax: today + '23:59:59.000Z',
      auth: googleAuthClient
    }, function(err, events) {
      if(err) {
        console.log('Error fetching events');
        console.log(err);
      } else {

        // Send our JSON response back to the browser
        console.log('Successfully fetched events');
        res.send(events);
      }
    }, function(){sendServerError(res);}
  );
});

app.get('/scheduler', function(req, res) {
  var file = 'intake-scheduler.html',
      options = {
        root: __dirname + '/www/'
      };
  res.sendFile(file, options);
});

function deleteEvent(eventID, onSuccess, onError) {
  googleApiWithAuthRefresh(
    googleCalendar.events.delete, {
      'calendarId': googleAPIKeys.calendarID,
      'eventId': eventID,
      'auth': googleAuthClient
    }, function(err) {
      if (err) {
        console.log('error while deleting event', eventID, err);
        onError && onError();
      } else {
        console.log('deleted event', eventID);
        onSuccess && onSuccess();
      }
    }, onError
  );
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

  var startStr = startTime.toISOString();
  var endStr = endTime.toISOString();

  // Call google to fetch events on calendar within time period
  googleApiWithAuthRefresh(
    googleCalendar.events.list, {
      calendarId: googleAPIKeys.calendarID,
      timeMin: startStr,
      timeMax: endStr,
      singleEvents: true, // split recurring events into single events
      auth: googleAuthClient
    }, function(err, data) {
      if(err) {
        console.log('Error fetching events');
        console.log(err);
        res.status(500).send('Server error while fetching calendar');
      } else {
          // Retrieve calendar events and convert to output format
          if (data.items.length === 0) {
            return res.send([]);
          }

          var eventItems = data.items;
          // Delete any events that are still tentative and should be timed out,
          // and just don't bother reporting them back to the user
          var i = 0;
          while (i < eventItems.length) {
            var item = eventItems[i];
            var created = item.created;
            var status = item.status;
            if (
              status === 'tentative' && 
              moment(moment(created) + TENTATIVE_EVENT_TIMEOUT) < now
            ) {
              deleteEvent(item.id);
              eventItems.splice(i, 1);
            } else {
              i++;
            }
          }

          eventItems.map(function(item) {
            var eventStart = item.start && item.start.dateTime;
            var eventEnd = item.end && item.end.dateTime;
            return {
              start: new Date(eventStart),
              end: new Date(eventEnd)
            };
          });

          var outputItems = [],
              currentStart = eventItems[0].start,
              currentEnd = eventItems[0].end;
          for (var i=1; i < eventItems.length; i++) {
            var item = eventItems[i];
            if (item.start < currentEnd) {
              currentEnd = Math.max(currentEnd, item.end);
            }
            else {
              outputItems.push({start: currentStart, end: currentEnd});
              currentStart = item.start;
              currentEnd = item.end;
            }
          }
          outputItems.push({start: currentStart, end: currentEnd});

          res.send(outputItems);
        }
    }, function(){sendServerError(res);}
  );
  return;
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

  var title = '[Tentative] Intake appointment';

  // Call Google API to insert an event
  googleApiWithAuthRefresh(
    googleCalendar.events.insert, {
      'calendarId': googleAPIKeys.calendarID,
      // Make sure to wrap Event objects in a 'resource' dictionary
      // Holy shit, that was annoying to figure out from the documentation
      'resource': {
        'end': {
          'dateTime': endTime
        },
        'start': {
          'dateTime': startTime
        },
        'status': 'tentative',
        'summary': title,
        'description': description
      },
      // What fields to return from the created event
      'fields': RETURNED_EVENT_FIELDS,
      'auth': googleAuthClient
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
    }, function(){sendServerError(res);}
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
    res.status(403).send('Bad request ID');
    return;
  }
  googleApiWithAuthRefresh(
    googleCalendar.events.patch, {
      'calendarId': googleAPIKeys.calendarID,
      'eventId': eventID,
      'resource': {
        'status': 'confirmed',
        'summary': '[Confirmed] Intake appointment'
      },
      'fields': RETURNED_EVENT_FIELDS,
      'auth': googleAuthClient
    }, function(err, patchedEvent) {
      var success = false;
      var outputEvent = null;
      if(err) {
        console.log(
          util.format('Error while patching event %s:', eventID), 
          err
        );
      } else {
        success = true;
        outputEvent = patchedEvent;
      }

      res.send({
        'success': success,
        'event': outputEvent
      });
    }, function(){sendServerError(res);}
  );
});

app.get('/intake', function(req, res) {
  // TODO: send along the intake form that corresponds to the animal type
  var animal = req.query.animal;
  var file = 'intake-form-' + animal + '.html',
      options = {
        root: __dirname + '/www/'
      };
  // First validate that tempplate file exists before sending it to client
  fs.stat(path.join(options.root, file), function(err, stats) {
    if (err || !stats.isFile()) {
      res.status(404).send(util.format('%s not found', file));
    } else {
      res.sendFile(file, options);
    }
  });
});

app.post('/intake/:animalType', function(req, res) {
  var animalType = req.query.animalType,
      formBody = req.body,
      intakeQuestionsPath = 'intake_questions/' + animalType + '.json';

  var answers = answerParser.parse(formBody);
});

app.get('/interview/:id', function(req, res) {
  res.send('TODO: send the actual interview guide');
});

function authNewGoogleClient(onSuccess, onError) {
  console.log('authorizing new Google service account...');
  var newClient = new google.auth.JWT(
    googleAPIKeys.serviceAccountEmail,
    googleAPIKeys.serviceKeyPath,
    null,
    ['https://www.googleapis.com/auth/calendar'] // calendar write scope
  );

  newClient.authorize(function(err, tokens) {
    if (err) {
      onError && onError(err);
      return;
    } else {
      // Save newly authed client to global variable
      googleAuthClient = newClient;
      console.log('new client authorized:', tokens.access_token);
      onSuccess && onSuccess();
    }
  });
}

var server = null;
function startServer() {
  // wait for Google client to authorize service account before starting server
  authNewGoogleClient(function() {
    server = app.listen(serverPort, 'localhost', 511, function() {
      var host = server.address().address;
      var port = server.address().port;

      console.log('App server listening at http://%s:%s', host, port);
    });
  }, function(err) {
      console.log("failed to authorize Google service account");
      console.log(err);
  });
}

startServer();

// Set up DB connections
mongoose.connect(mongooseUrl);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  console.log('MongoDB connection open at ' + mongooseUrl);
});

// How we plan to store info from the intake form
var intake = mongoose.model('intake', {

});
