module.exports = {
	'privateConfig':'./.config.js',
	'tmpPath':'/tmp',
	'video':{
		'numCameras':40,
		'framerate':14,
		'width':1620,
		'height':1080,
		'loop':4,
		'bitrate':'24000k',
		'ffmpegBinary':'ffmpeg',
		'header':'revolve_scaled_yuvj422p-2.jpg',
		'footer':'footer_yuvj422p-2.jpg',
		'headerDuration':3,
		'footerDuration':3,
		'firstFrameDuration':2
	},
	'youTubeOptions':{
		'shortUrl':'https://youtu.be/{0}',
		'redirectPort': 5000,
		'redirectUrlPath':'/oauth2callback',
		'title': 'The Costume Games {dir} {time} {date}', // availbile format keys {dir}, {time}, {date}
		'tags': ['3dify','revolve','revolvebrighton'],
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