var fs = require('fs');

var nodemailer = require('nodemailer');
var htmlToText = require('nodemailer-html-to-text').htmlToText;

module.exports = function(config){

	var exports = {};
	var emailTemplate = "";

	var transporter = nodemailer.createTransport({
    service: 'Gmail',
	    auth: {
	        user: config.email.user,
	        pass: config.email.password
	    }
	});

	transporter.use('compile', htmlToText());

	[
		'emailNotificationTemplate',
		'emailNotificationSubject'
	].forEach(function(option){
		if( !config.emailOptions.hasOwnProperty(option) ){
			throw new Error("Missing config option: {0}".format(option));
		}
	});

	fs.readFile(config.emailOptions.emailNotificationTemplate,'utf8',function(err,contents){
		if( err ) throw err;
		emailTemplate = contents.toString();
	});

	exports.sendEmail = function( address, data, attachments ){
		var options = {
			from: config.email.from,
			to: address,
			subject: config.emailOptions.emailNotificationSubject.format(data),
			html: emailTemplate.format(data),
			attachments: attachments
		}

		transporter.sendMail(options,function(error,info){
			if(error){
				console.error(error);
			}
			if( info ){
				console.log(info.response);				
			}
		});
	}


	return exports;
}