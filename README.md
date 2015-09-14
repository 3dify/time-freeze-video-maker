# Time Freeze Video Maker

## Installation

Checkout out the repository and then run the following in the project dir.
```
npm install
```

## Usage

To continuously watch a directory:
```
./main.js -w {parent_dir}
```

To process the images in a directory
```
./main.js {image_dir}
```

## Config

Configuration is stored in config.js and .config.js. 

## Secret Config

Make .config.js by copying private-config-template.js and filling in the details.

## Todo
* Integrate stablization code
* Expose title

## Complete
* Create video file
* Upload to youTube
* Generate QR Code for youTube url
* Print QR Code on thermal printer
* Detect change to directory, build sorted image set
* Create processing queue for directories to process


