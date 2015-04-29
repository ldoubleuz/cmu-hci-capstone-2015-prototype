module.exports = {
    authNewGoogleClient: authNewGoogleClient,
    addTentativeEvent: addTentativeEvent,
    getBlockedTimes: getBlockedTimes,
    confirmTentativeEvent: confirmTentativeEvent,
    deleteEvent: deleteEvent
};

var google = require('googleapis'),
    googleAPIKeys = require('./googleAPIKeys'),
    moment = require('moment');

// Google calendar authentication info
var googleCalendar = google.calendar('v3');
var googleAuthClient = null; // To be setup by authNewGoogleClient
// What fields google calendar event resources returned by api calls should have
var RETURNED_EVENT_FIELDS = 'description,summary,start,end,id,status,created';
// How long to block off an unconfirmed intake appointment event timeslot before
// freeing it back up for other users
var TENTATIVE_EVENT_TIMEOUT = moment.duration(12, 'hours');

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
      if (onError) {
        onError(err);
      }
    } else {
      // Save newly authed client to global variable
      googleAuthClient = newClient;
      console.log('new client authorized:', tokens.access_token);
      if (onSuccess) {
        onSuccess();
      }
    }
  });
}

// Wrapper function for any google API call, in order to automatically refresh
// the authclient when the accesstoken expires. Takes the api function to call,
// the input data that would have been passed to the api call, and the callback
// function that would be handled during the api response.
function googleApiWithAuthRefresh(apiFn, inputData, callbackFn, onFailedAuth) {
  var apiAttempts = 0;
  var maxAttempts = 4;

  function _attemptReauth() {
    authNewGoogleClient(
        function() {_attemptApiCall(false);},
        function() {_attemptApiCall(true);}
    );
  }

  function _attemptApiCall(justFailedAuthAttempt) {
    if (apiAttempts >= maxAttempts) {
      console.log('unable to reauthorize client, giving up...');
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
      for (var key in inputData) {
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

function combineOverlappingItems(eventItems) {
  var combinedItems = [];
  eventItems = eventItems.map(function(item) {
    return {
      start: new Date(item.start.dateTime),
      end: new Date(item.end.dateTime)
    };
  });
  // Remember to sort by start date
  eventItems.sort(function(itemA, itemB) {
    return itemA.start - itemB.start;
  });

  if (eventItems.length > 0) {
    var currentStart = eventItems[0].start,
        currentEnd = eventItems[0].end;
    for (i = 1; i < eventItems.length; i++) {
      var item = eventItems[i];
      if (item.start <= currentEnd) {
        currentEnd = new Date(Math.max(currentEnd, item.end));
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

function getBlockedTimes(startTime, endTime, onSuccess, onError) {
  googleApiWithAuthRefresh(
      googleCalendar.events.list, {
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

        var now = moment();

        // Delete any events that are still tentative and should be timed out.
        var eventItems = data.items.filter(function(item) {
          if (item.status === 'tentative' &&
              moment(moment(item.created) + TENTATIVE_EVENT_TIMEOUT) < now) {
            deleteEvent(item.id);
            return false;
          }
          return true;
        });

        var outputItems = combineOverlappingItems(eventItems).map(
          function(item) {
            return {
              start: item.start.toISOString(),
              end: item.end.toISOString()
            };
          });
        onSuccess(outputItems);
      }, onError);
}

function addTentativeEvent(startTime, endTime, description, onSuccess, onError) {
  // Call Google API to insert an event
  googleApiWithAuthRefresh(
      googleCalendar.events.insert, {
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
      }, onSuccess, onError
  );
}

function confirmTentativeEvent(eventID, onSuccess, onError, onAuthFail) {
  onAuthFail = onAuthFail || function(){};

  googleApiWithAuthRefresh(
      googleCalendar.events.patch, {
        'calendarId': googleAPIKeys.calendarID,
        'eventId': eventID || '',
        'resource': {
          'status': 'confirmed',
          'summary': '[Confirmed] Intake appointment'
        },
        'fields': RETURNED_EVENT_FIELDS,
        'auth': googleAuthClient
      }, function(err, patchedEvent) {
        if (err) {
          console.log('Error while patching event: ' + eventID, err);
          onError && onError(err);
        } else {
          onSuccess && onSuccess(patchedEvent);
        }
      }, onAuthFail
  );
}

function deleteEvent(eventID, onSuccess, onError) {
  googleApiWithAuthRefresh(
      googleCalendar.events.delete, {
        calendarId: googleAPIKeys.calendarID,
        eventId: eventID,
        auth: googleAuthClient
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
