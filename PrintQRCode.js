var Printer = require('thermalprinter');
var qr = require('qr-image');
var fs = require('fs');
var serialport = require('serialport');
var yargs = require('yargs');


var resizeImage = function(size,data){
    oldBuffer = data.data;
    margin = Math.floor( ( size - data.size ) / 2) ;
    var newBuffer = Buffer((size+1)*size);
    newBuffer.fill(255);
    var N = data.size;

    for(var i=0;i<size;i++){
        newBuffer[(size+1)*i] = 0;
        
    }

    for(var i=0;i<N;i++){
        for(var j=0;j<N;j++){
            newBuffer[(i+margin)*(size+1)+(j+margin)] = oldBuffer[i*(N+1)+j];
        }
    }
    
    data.data = newBuffer;
    data.size = size;
}

module.exports = {
	printUrl : function(url,config){

		if( config == null ){
			config = {
				'device':'/dev/tty.usbserial-AD0266G4',
				'baudrate':9600,
				'width':384,
				'logo':'logo.png'
			}
		} 

		
		var resize = resizeImage.bind(null,config.width);

		var pngFile = 'QR'+Date.now()+'.png';
		var logoFile = config.logo;
		var qrPng = qr.imageSync(url, { 
        type: 'png', 
        size:12, 
        margin:0, 
        customize:resize});

		fs.writeFileSync(pngFile,qrPng);
		
		var serialPort = new serialport.SerialPort(config.device, {
        	baudrate: config.baudrate
		});

		serialPort.on('open',function(error) {
		    if ( error ) {
		        console.log('failed to open: '+error);
		        return;
		    }
		    var printer = new Printer(serialPort,{
		        heatingTime : 255,
		        heatingInterval: 0,
		        maxPrintingDots: 1
		    });
			printer.on('ready', function() {
		        printer
		            .lineFeed(4)

		        if( logoFile ){
		        	printer.printImage(logoFile);
		        }
		         	
		            
		        printer
		        	.bold(true)
		            .indent(2)
		            .big(url.length<15?true:false)
		            .printLine(url)
		            .printImage(pngFile)
		            .lineFeed(4)
		            .print(function() {
		                console.log('done');
		                serialPort.close();
		                fs.unlinkSync(pngFile);
		            });

		    });
		});
		
	}
};

if (require.main === module) {
    module.exports.printUrl(yargs.argv._.join(' '));
}
