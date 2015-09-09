var google = require('googleapis');
var util = require('util');
var open = require('open');
var express = require('express');

var exports = {};
var port = 5000;
var redirectUrlPath = '/oauth2callback';

var OAuth2 = google.auth.OAuth2;

var options = {

};

var authenticated = false;

exports.options = function(opts){
	options = util._extend(options,opts);
};

exports.authenticate = function(config, authCompleteCallback){

	var oauth2Client = new OAuth2(config.youTube.clientId, config.youTube.clientSecret, 'http://localhost:'+config.youTube.redirectPort+config.youTube.redirectUrlPath);
	google.options({ auth: oauth2Client }); 

	var authenticateByRefreshToken = function(){
		oauth2Client.setCredentials({
			access_token: options.accessToken,
			refresh_token: options.refreshToken
		});
		oauth2Client.refreshAccessToken(function(err, tokens) {
		  // your access_token is now refreshed and stored in oauth2Client
		  // store these new tokens in a safe place (e.g. database)
		  options.accessToken = tokens.access_token || options.accessToken; 
		  options.refreshToken = tokens.refresh_token || options.refreshToken; 
		  console.info("Add the refresh token to you");
		  console.info(tokens);
		  authCompleteCallback();
		  authenticated = true;
		});
	}

	var authenticateByUrl = function(){
		
		var url = oauth2Client.generateAuthUrl({
    		access_type: 'offline', 
	    	scope: options.scope
  		});
  		
  		var app = express();
  		app.get(redirectUrlPath,function(req,res){
  			
  			oauth2Client.getToken(req.query.code, function(err, tokens) {
		      // set tokens to the client
		      // TODO: tokens should be set by OAuth2 client.
		      if(err){
		      	console.error(err);
		      	server.close();
		      	return;
		      }
      		  options.accessToken = tokens.access_token || options.accessToken; 
			  options.refreshToken = tokens.refresh_token || options.refreshToken; 

		      	oauth2Client.setCredentials(tokens);
		      	res.send(util.inspect(tokens));
		      	authenticated = true;
  		    	server.close();
  		    	authCompleteCallback();
	    	});

  		});
  		var server = app.listen(port, function(){
		  	open(url);
  		});

	}

	if( authenticated ) return;

	if( options.refreshToken ){
		authenticateByRefreshToken();
	}
	else {
		authenticateByUrl();
	}
}

/*
	


	
*/ 
module.exports = exports;