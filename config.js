module.exports = {
	'privateConfig':'./.config.js',
	'tmpPath':'/tmp',
	'video':{
		'numCameras':50,
		'framerate':18,
		'width':1620,
		'height':1080,
		'loop':8,
		'bitrate':'8000k',
		'ffmpegBinary':'ffmpeg',
		'header':'revolve_scaled.jpg',
		'footer':'footer.jpg',
		'headerDuration':3
	},
	'youTubeOptions':{
		'shortUrl':'https://youtu.be/{0}',
		'redirectPort': 5000,
		'redirectUrlPath':'/oauth2callback',
		'title': 'eventname {dir} {time} {date}', // availbile format keys {dir}, {time}, {date}
		'tags': ['3dify'],
		'description':''
	},
	'basedir':__dirname,
	'processed':'processed.txt',
	'queueAutoSavePeriod':20000,
	'queueFile':'queue.json',
	'serialPrinter': {
		'device':'/dev/cu.usbserial-AL00FQG7',
		'baudrate':9600,
		'width':384,
		'heatingTime':200,
		'heatingInterval':2,
		'maxPrintingDots':4,
		'topLineFeed':1,
		'bottomLineFeed':4,
		'closeDelay':1000,
		'logo':'logo.png'
	}
};