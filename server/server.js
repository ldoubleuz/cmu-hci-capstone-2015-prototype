/*jshint node: true*/
var mongoose = require('mongoose'),
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
   .get('/intake', function (req, res) {
      res.send('TODO: send the actual intake form');
    })
    .post('/intake', function(req, res) {

    })
    .get('/interview/:id', function (req, res) {
      res.send('TODO: send the actual interview guide');
    });

var server = app.listen(serverPort, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
