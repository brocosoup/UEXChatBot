/*
Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://aws.amazon.com/apache2.0/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

*/

// Define our dependencies
var express = require('express');
var session = require('express-session');
var passport = require('passport');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var request = require('request');
var handlebars = require('handlebars');
var fs = require('fs');
var https = require('https');
var http = require('http');

function initJSONFile(file)
{
	if (!fs.existsSync(file + '.json')) {
		fs.writeFileSync(file + '.json', fs.readFileSync(file + '-template.json'))
	}
}

initJSONFile('server');
let rawdata = fs.readFileSync('server.json');
let config = JSON.parse(rawdata);

var credentials = {key: config.server.privateKey, cert: config.server.certificate};

// Define our constants, you will change these with your own
const TWITCH_CLIENT_ID = config.server.client;
const TWITCH_SECRET = config.server.secret;
const SESSION_SECRET = config.server.session;
const CALLBACK_URL = config.server.callback; // You can run locally with - http://localhost:3000/auth/twitch/callback

var loggedinUser = '';
// Initialize Express and middlewares
var app = express();
app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());

// Override passport profile function to get user profile from Twitch API
OAuth2Strategy.prototype.userProfile = function (accessToken, done) {
  var options = {
    url: 'https://api.twitch.tv/helix/users',
    method: 'GET',
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Accept': 'application/vnd.twitchtv.v5+json',
      'Authorization': 'Bearer ' + accessToken
    }
  };

  request(options, function (error, response, body) {
    if (response && response.statusCode == 200) {
      done(null, JSON.parse(body));
    } else {
      done(JSON.parse(body));
    }
  });
}

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});



passport.use('twitch', new OAuth2Strategy({
  authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
  tokenURL: 'https://id.twitch.tv/oauth2/token',
  clientID: TWITCH_CLIENT_ID,
  clientSecret: TWITCH_SECRET,
  callbackURL: CALLBACK_URL,
  state: true
},
  function (accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;
    profile.display_name = profile.data[0].display_name;
    profile.bio = profile.data[0].description;
    profile.logo = profile.data[0].profile_image_url;
    // Securely store user profile in your DB
    //User.findOrCreate(..., function(err, user) {
    //  done(err, user);
    //});
    loggedinUser = profile;
    done(null, profile);
  }
));

var server;

function runAuthServ() {
  // Set route to start OAuth link, this is where you define scopes to request
  app.get('/auth/twitch', passport.authenticate('twitch', { scope: ['user_read', 'chat:read', 'chat:edit'] }));

  // Set route for OAuth redirect
  app.get('/auth/twitch/callback', passport.authenticate('twitch', { successRedirect: '/', failureRedirect: '/' }));

  // Define a simple template to safely generate HTML with values from user's profile
  var template = handlebars.compile(`
	<html><head><title>UEXChatBot</title></head>
	<center><h1>UEXChatBot</h1>
	<table>
		<tr><th>Logged in user:</th><td><img src='{{logo}}' width="30" height="30"></td><td style='text-align:left; vertical-align:middle'>{{display_name}}</td></tr>
		<tr><th>Access Token</th><td></td><td>{{accessToken}}</td></tr>
		<tr><th>Refresh Token</th><td></td><td>{{refreshToken}}</td></tr>
	</table></center></html>`);

  // If user has an authenticated session, display it, otherwise display link to authenticate
  app.get('/', function (req, res) {
    if (req.session && req.session.passport && req.session.passport.user) {
      res.send(template(req.session.passport.user));
    } else {
      res.send('<html><head><title>UEXChatBot</title></head><body><center><h1>UEXChatBot</h1><a href="/auth/twitch"><h2>Authentifiez vous avec twitch</h2></a></center></body></html>');
    }
  });

  if (credentials.key != undefined && credentials.key != '' )
  {
    server = https.createServer(credentials, app).listen(3000, function () {
      console.log('Secure Authentication server listening on port 3000!')
    });
  } else {
    server = app.listen(3000, function () {
      console.log('Authentication server listening on port 3000!')
    });
  }
}

function getProfile() {
  return loggedinUser;
}

function close() {
  server.close();
}

module.exports = {
  runAuthServ,
  getProfile,
  close
};
