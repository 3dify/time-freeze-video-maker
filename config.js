module.exports = {
	'privateConfig':'./.config.js',
	'numCameras':10,
	'framerate':18,
	'width':1620,
	'height':1080,
	'loop':8,
	'bitrate':'8000k',
	'ffmpegBinary':'ffmpeg',
	'tmpPath':'/tmp',
	'youTubeOptions':{
		'shortUrl':'https://youtu.be/%s',
		'redirectPort': 5000,
		'redirectUrlPath':'/oauth2callback'
	}
};