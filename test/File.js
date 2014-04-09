
'use strict';


var fs = require('fs');

function File(name, seek, ends) {
    if ( arguments.length === 1 ) {
	this.name = name;
	this.file = fs.openSync(name, 'r');
	this.seek = 0
	this.ends = fs.fstatSync(this.file).size;
    } else {
	this.name = name.name;
	this.file = name.file;
	this.seek = name.seek;
	this.ends = name.ends;
    }
}

File.prototype.slice = function (star, ends) {
    return new File(this, star, ends);
}

function FileReader(file) {
    this.file = file.file;
    this.name = file.name;
    this.seek = file.seek;
    this.ends = file.ends;

    this.onloadend = undefined;
}

FileReader.prototype.readAsArrayBuffer = function(slice) {
    var buffer = new Buffer(slice.ends-slice.seek);
    fs.readSync(this.file, buffer, 0, slice.ends-slice.seek, slice.seek);

    this.onloadend(buffer);
}

FileReader.prototype.readAsBinaryString = function(slice) {
    var buffer = new Buffer(slice.ends-this.seek);
    fs.readSync(slice.file, buffer, 0, slice.ends-slice.seek, slice.seek);

    this.onloadend(buffer.toString('ascii'));
}

