var SerialPort = require('serialport').SerialPort,
    serialPort = new SerialPort('/dev/tty.usbserial-AD0266G4', {
        baudrate: 9600
    }),
    Printer = require('thermalprinter');
var qr = require('qr-image');
var fs = require('fs');

/*
    Pin outs

    1 - V ( Red )
    2 - DTR
    3 - TX
    4 - RX
    5 - G

*/

var pngFile = 'qr-test.png';

var resizeImage = (function(size,data){
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
).bind(null,384);

var qrPng = qr.imageSync('This is a test!', { 
        type: 'png', 
        size:14, 
        margin:0, 
        customize:resizeImage});

fs.writeFileSync(pngFile,qrPng);

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
            .bold(true)
            .indent(2)
            .big(true)
            .printLine('first line')
            .printImage(pngFile)
            .lineFeed(4)
            .print(function() {
                console.log('done');
                serialPort.close();
            });

    });
});