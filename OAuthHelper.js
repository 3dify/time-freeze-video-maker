var google = require('googleapis');
var util = require('util');
var open = require('open');
var express = require('express');

var exports = {};

var OAuth2 = google.auth.OAuth2;

var options = {

};

var authenticated = false;

exports.options = function(opts){
	options = util._extend(options,opts);
};

exports.authenticate = function(config, authCompleteCallback){

	var oauth2Client = new OAuth2(config.youTube.clientId, config.youTube.clientSecret, 'http://localhost:'+config.youTubeOptions.redirectPort+config.youTubeOptions.redirectUrlPath);
	google.options({ auth: oauth2Client }); 

	var setCredentials = function(){
		oauth2Client.setCredentials({
			access_token: options.accessToken,
			refresh_token: options.refreshToken
		});
	}

	var authenticateByRefreshToken = function(){
		setCredentials();
		oauth2Client.refreshAccessToken(function(err, tokens) {

		  if( err ){
		  	//if this failed the token may have expired, try the main technique
		  	options.refreshToken = null;
		  	options.accessToken = null;
		  	exports.authenticate(config,authCompleteCallback);
		  	return;
		  }

		  if( options.refreshToken != tokens.refresh_token ){
			  console.info("Add the refresh token to your config file");
			  console.info(tokens);		  	
		  }

		  options.accessToken = tokens.access_token || options.accessToken; 
		  options.refreshToken = tokens.refresh_token || options.refreshToken; 
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
  		app.get(config.youTubeOptions.redirectUrlPath,function(req,res){
  			
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

		      	setCredentials();
		      	res.send(util.inspect(tokens));
		      	authenticated = true;
		      	res.end();
		    	console.log("shutting server down... this can take a while, be patient");
	    		server.close(function(){
	    			console.log("server shut down");
	    			authCompleteCallback();
	    		});	
	    	});

  		});
  		var server = app.listen(config.youTubeOptions.redirectPort, function(){
  			server.setTimeout(1000);
		  	open(url);
  		});

	}

	if( authenticated ){
		setCredentials();
		authCompleteCallback();
		return;
	};

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