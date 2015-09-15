# Time Freeze Video Maker

## Installation

Checkout out the repository and then run the following in the project dir.
```bash
npm install
```

## Usage

To continuously watch a directory:
```bash
./main.js -w {parent_dir}
```

To process the images in a directory
```bash
./main.js {image_dir}
```

## Config

Configuration is stored in config.js and .config.js. 

## Secret Config

Make .config.js by copying private-config-template.js and filling in the details.

## Thermal Printer

```
    Pin outs

    1 - V ( Red )
    2 - DTR
    3 - TX
    4 - RX
    5 - G
```

## Todo
* Integrate stablization code
* Add option for insertion of splash header and info footer to video.

## Complete
* Create video file
* Upload to youTube
* Generate QR Code for youTube url
* Print QR Code on thermal printer
* Detect change to directory, build sorted image set
* Create processing queue for directories to process


