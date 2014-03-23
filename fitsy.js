/*jslint evil: true, white: true, vars: true, plusplus: true, nomen: true, unparam: true, regexp: true, bitwise: true */
/*jshint node: true, -W099: true, laxbreak:true, laxcomma:true, multistr:true, smarttabs:true */
/*global alert, XMLHttpRequest
       , Uint8Array, Int8Array, Uint16Array, Int16Array, Int32Array, Float32Array, Float64Array, DataView
       , FileReader, Blob
       , typedArrayFunction */

"use strict";

var Fitsy;
if( Fitsy && (typeof Fitsy !== "object" || Fitsy.NAME) ){
    throw new Error("Namespace 'Fitsy' already exists");
}

// Create our namespace, and specify some meta-information
Fitsy = {};
Fitsy.NAME = "Fitsy";		// The name of this namespace
Fitsy.VERSION = "1.0";		// The version of this namespace

// there are different versions of slice ... with different syntax
Fitsy.getSlice = function(file, start, end){
    var blob;
    if( file.slice ){
        blob = file.slice(start, end);
    } else if( file.mozSlice ){
        blob = file.mozSlice(start, end);
    } else if( file.webkitSlice ){
        blob = file.webkitSlice(start, end);
    }
    return blob;
};

// return true if its a number (int or float)
Fitsy.isNumber = function(s) {
  return !isNaN(parseFloat(s)) && isFinite(s);
};

Fitsy.cardpars = function(card){
    var name, value;
    if ( card[8] !== "=" ){ 
	return [undefined, undefined];
    }
    name = card.slice(0, 8).trim();
    value = card.slice(10).replace(/\'/g, " ").replace(/\/.*/, "").trim();
    if( value === "T" ){ 
	value = true;
    } else if( value === "F" ){
	value = false;
    } else if( Fitsy.isNumber(value) ){
	value = parseFloat(value);
    }
    return [name, value];
};

Fitsy.readImageHDUDataConverter = function(fits, hdu, options, handler){
    var dv, getfunc, i, off, zero;
    var littleEndian = false;
    hdu.dmin = Number.MAX_VALUE;
    hdu.dmax = Number.MIN_VALUE;
    hdu.filename = fits.name;

    dv = new DataView(fits.read.result);

    switch( hdu.bitpix ) {
     case   8:
	getfunc = DataView.prototype.getUint8;
	hdu.data = new Uint8Array(hdu.datapixls);
	break;
     case -16:
	getfunc = DataView.prototype.getUint16;
	hdu.data = new Uint16Array(hdu.datapixls);
	break;
     case  16:
	if ( hdu.bzero && hdu.bzero === 32768 ) {
	    getfunc = DataView.prototype.getUint16;
	    hdu.data = new Uint16Array(hdu.datapixls);
	    hdu.bitpix = -16;
	} else {
	    getfunc = DataView.prototype.getInt16;
	    hdu.data = new Int16Array(hdu.datapixls);
	}
	break;
     case  32:
	getfunc = DataView.prototype.getInt32;
	hdu.data = new Int32Array(hdu.datapixls);
	break;
     case -32:
	getfunc = DataView.prototype.getFloat32;
	hdu.data = new Float32Array(hdu.datapixls);
	break;
     case -64:
	getfunc = DataView.prototype.getFloat64;
	hdu.data = new Float64Array(hdu.datapixls);
	break;
    }
    zero = hdu.bzero || 0;

    // Convert raw bytes to image data
    //
    for(i=0, off=0; i < hdu.datapixls; i++, off += hdu.pixlbytes) {
	hdu.data[i] = getfunc.call(dv, off, littleEndian) + zero;
	if ( isNaN(hdu.data[i]) ) {
            hdu.data[i] = 0;
        }
	hdu.dmin    = Math.min(hdu.dmin, hdu.data[i]);
	hdu.dmax    = Math.max(hdu.dmax, hdu.data[i]);
    }

    handler(hdu, options);
};

Fitsy.readImageHDUData = function(fits, hdu, options, handler) {
    fits.read.onloadend = function() { Fitsy.readImageHDUDataConverter(fits, hdu, options, handler); };
    fits.read.readAsArrayBuffer(Fitsy.getSlice(fits.file, hdu.dataseek, hdu.dataseek + hdu.databloks*2880));
};

var TableTFORM = {
      L: { type: "UChar", 	size: 1 }
    , X: { type: "BITS", 	size: 1 }
    , B: { type: "UChar", 	size: 1 }
    , I: { type: "Int16", 	size: 2 }
    , J: { type: "Int32", 	size: 4 }
    , K: { type: "Int64", 	size: 8 }
    , A: { type: "Char", 	size: 1 }
    , E: { type: "Float32", 	size: 4 }
    , D: { type: "Float64", 	size: 8 }
    , C: { type: "Complex64", 	size: 8 }
    , M: { type: "Complex128", 	size:16 }
    , P: { type: "Pointer32", 	size: 8 }
    , Q: { type: "Pointer64", 	size:16 }
};

Fitsy.readError = function (fits) {
    alert("Error on read");
}

Fitsy.readForDeCompress = function(fits) {
    var data = new Uint8Array(fits.read.result);

    if ( data[0] === 0x1f && data[1] === 0x8B ) {
	data = pako.inflate(data);

	fits.file = new Blob([data]);
    }
    fits.read.onloadend = function(){ Fitsy.readHeaderBlock(fits); };
    fits.read.onerror   = function(){ Fitsy.readError(fits); };
    fits.read.readAsBinaryString(Fitsy.getSlice(fits.file, 0, 2880));
};

Fitsy.readHeaderBlock = function(fits) {
    var i, off, card, pars;
    var end = 0;

    if( !fits.hdu[fits.nhdu] ){ 
	fits.hdu[fits.nhdu]  = {};
    }
    var hdu = fits.hdu[fits.nhdu];
    if ( ! hdu.card ) {
	// Mark offset in file where header starts.
	hdu.headseek = fits.here;
	hdu.card = [];
	hdu.head = {};
	hdu.ncard = 0;

 	hdu.fits = fits;
 	hdu.nth  = fits.nhdu;

	if ( fits.here === 0 && fits.read.result.slice(0, 6) !== "SIMPLE" ) {
	    fits.read.onloadend = function(){ Fitsy.readForDeCompress(fits); };
	    fits.read.readAsArrayBuffer(fits.file);
	    return;
	}
    }
    if ( fits.here === 0 && fits.read.result.slice(0, 6) !== "SIMPLE" ) {
	return;
    }
	
    // Read the block advance the file pointer.
    fits.here += 2880;
    for(off=0; off < 2880; hdu.ncard++, off += 80) {
	card = fits.read.result.slice(off, off+80);
	hdu.card[hdu.ncard] = card;
	if( card.slice(0, 8) === "END     " ){
	    end = 1;
	    break;
	}
	pars = Fitsy.cardpars(card);
	if ( pars[0] ) {
	    hdu.head[pars[0]] = pars[1];
	}
    }
    if ( end ) {
	hdu.axis  = [];
	hdu.dataseek  = fits.here; 				// Mark offset in file where data starts.
	hdu.naxis     = hdu.head.NAXIS;
	hdu.bitpix    = hdu.head.BITPIX;
	hdu.bscale    = hdu.head.BSCALE;
	hdu.bzero     = hdu.head.BZERO;
	hdu.pixlbytes = Math.abs(hdu.bitpix)/8;

 	if ( hdu.naxis !== 0 ) {
 	    hdu.datapixls = 1;
 	} else {
 	    hdu.datapixls = 0;
 	}

	for(i=1; i <= hdu.naxis; i++){
	    hdu.axis[i] = hdu.head["NAXIS" + i];
	    hdu.datapixls *= hdu.axis[i];
	}
	hdu.databytes = hdu.datapixls * hdu.pixlbytes;
	hdu.databloks = ((hdu.databytes+(2880-1))/2880) | 0;	// |0 is truncate.
	fits.here += hdu.databloks * 2880;
	fits.nhdu++;

	if ( hdu.head.XTENSION === "BINTABLE"
	  || hdu.head.XTENSION === "A3DTABLE"
	  || hdu.head.XTENSION === "3DTABLE" ) {
	     hdu.table = {};

	    hdu.width  = hdu.axis[1];
	    hdu.length = hdu.axis[2];

	    var form, rept, type, size, width, offs = 0;

	    for ( i = 1; i <= hdu.head.TFIELDS; i++ ) {
		form = hdu.head["TFORM"+i].match(/([0-9]*)([LXBIJKAEDCMPQ])/);

		rept = form[0] === "" ? 1 : +form[1];
		type = TableTFORM[form[2]].type;
		size = TableTFORM[form[2]].size;
		width = rept * size;

		hdu.table[hdu.head["TTYPE"+i]] = {
		      type: type
		    , size: size, width: width , rept: rept, offs: offs
		    , unit: hdu.head["TUNIT"+i], disp:  hdu.head["TDISP"+i]
		    , zero: hdu.head["TZERO"+i], scale: hdu.head["TSCAL"+i]

		    , min: hdu.head["TDMIN"+i] || hdu.head["TLMIN"+i]
		    , max: hdu.head["TDMAX"+i] || hdu.head["TLMAX"+i]
		};
		offs += width;
	    }
	}
    }
    if ( fits.here >= fits.size ) {				// EOF? handler the fits file to the handler function
	fits.handler(fits);
    } else { 							// Or, read the next header block
	fits.read.readAsBinaryString(Fitsy.getSlice(fits.file,
						    fits.here,
						    fits.here+2880));
    }
};

Fitsy.fitsopen = function(file, handler) {
    var fits  = {};
    fits.hdu  = [];
    fits.read = new FileReader();
    fits.handler = handler; 		// User callback to complete delivery of FITS data.
    fits.name = file.name;
    fits.size = file.size;
    fits.file = file;
    fits.nhdu = 0;
    fits.here = 0;

    fits.read.onloadend = function(){ Fitsy.readHeaderBlock(fits); };
    fits.read.readAsBinaryString(Fitsy.getSlice(fits.file, 0, 2880));
};


Fitsy.template = function (str, data) {
    
    return str.replace(/\{\{([a-zA-Z0-9_.]+)(%([sfd])(\.([0-9]+))?)?\}\}/g,
	function (m,key, x, type, y, prec) {
	    var i, val = data;
	
	    key = key.split(".");

	    for ( i = 0; i < key.length; i++ ) {
		if ( val.hasOwnProperty(key[i]) ) { val = val[key[i]];
		} else { 			    return ""; 		}
	    }

	    switch ( type ) {
	     case "s": 				break;
	     case "f": val = val.toFixed(prec); break;
	     case "d": val = val.toFixed(0); 	break;
	    }

	    return val;
	}
    );
};

Fitsy.BinTableTemplate = "									\n\
  return function (table, image, bin) {								\n\
    var i, x, y;										\n\
    var xoff = -(table.table.x.max - table.table.x.min + 1) / 2;		\n\
    var yoff = -(table.table.y.max - table.table.y.min + 1) / 2;		\n\
												\n\
    for (i = 0; i < table.length; i++) {							\n\
	x = table.view.get{{table.table.x.type}}(i * {{table.width}} + {{table.table.x.offs}});	\n\
	y = table.view.get{{table.table.y.type}}(i * {{table.width}} + {{table.table.y.offs}});	\n\
												\n\
	x = (((x + xoff) /bin) | 0) + {{image.nx}}/2;						\n\
	y = (((y + yoff) /bin) | 0) + {{image.ny}}/2;						\n\
												\n\
	if (x >= 0 && x < {{image.nx}} && y >= 0 && y < {{image.ny}}) {				\n\
	    image.data[y * {{image.width}} + x] += 1;						\n\
	}											\n\
    }												\n\
}";

Fitsy.readTableHDUDataBinner = function (fits, hdu, options, handler) {
    var i;

    hdu.tabl = fits.read.result;
    hdu.view = new DataView(hdu.tabl);
    hdu.data = new Int32Array(options.table.nx*options.table.ny);

    for ( i = 0; i < options.table.xcol.length; i++ ) { 			// Choose an X axis column
	if ( hdu.table[options.table.xcol[i]] !== undefined ) { break; }
    }
    for ( i = 0; i < options.table.ycol.length; i++ ) {				// Choose a  Y axis column
	if ( hdu.table[options.table.ycol[i]] !== undefined ) { break; }
    }

    var x = hdu.table[options.table.xcol[i]];
    var y = hdu.table[options.table.ycol[i]];

    var table = { table: { x: { type: x.type, offs: x.offs, min: Number(x.min), max: Number(x.max) }
		         , y: { type: y.type, offs: y.offs, min: Number(y.min), max: Number(y.max) } }
    		, cx: options.table.cx, cy: options.table.cy
		, width: hdu.width, length: hdu.length
		, view: hdu.view
    };

    var image = { nx: options.table.nx, ny: options.table.ny
		, width: options.table.nx
		, data: hdu.data
    };

    if ( table.cx === undefined ) {
	table.cx = (table.table.x.max - table.table.x.min + 1) / 2;
    }
    if ( table.cy === undefined ) {
	table.cy = (table.table.y.max - table.table.y.min + 1) / 2;
    }

    var key = table.table.x.type + "," + table.table.x.offs + ","
	    + table.table.y.type + "," + table.table.y.offs + ","
	    + image.width + "," + image.type;

    if ( Fitsy.binner      === undefined ) { Fitsy.binner = {}; }
    if ( Fitsy.binner[key] === undefined ) {
	var values = { table: table, image: image };
	var text = Fitsy.template(Fitsy.BinTableTemplate, values);
	console.log(text);

	Fitsy.binner[key] = new Function(text)();
    }
    Fitsy.binner[key](table, image, options.table.bin);

    hdu.table.bin = options.table.bin;
    hdu.table.nx  = options.table.nx;
    hdu.table.ny  = options.table.ny;
    hdu.table.cx  = image.nx/2;
    hdu.table.cy  = image.ny/2;


    hdu.dmin = Number.MAX_VALUE;
    hdu.dmax = Number.MIN_VALUE;

    for ( i = 0; i < image.nx*image.ny; i++ ) {
	hdu.dmin    = Math.min(hdu.dmin, hdu.data[i]);
	hdu.dmax    = Math.max(hdu.dmax, hdu.data[i]);
    }

    hdu.axis[1] = image.nx;
    hdu.axis[2] = image.ny;

    handler(hdu);
};

Fitsy.readTableHDUData = function (fits, hdu, options, handler) {
    fits.read.onloadend = function() { Fitsy.readTableHDUDataBinner(fits, hdu, options, handler); };
    fits.read.readAsArrayBuffer(Fitsy.getSlice(fits.file, hdu.dataseek, hdu.dataseek + hdu.databloks*2880));
};


Fitsy.convertPixel = function (data, bitpix, zero) {
    var dv = new DataView(data);

    switch( bitpix ) {
    case   8:
	return dv.getUint8(0, false);
    case -16:
	return dv.getInt16(0, false) 	 + zero;
    case  16:
	if ( zero === 32768 ) {
	    return dv.getInt16(0, false) + zero;
	}
	return dv.getInt16(0, false);
    case  32:
	return dv.getInt32(0, false);
    case -32:
	return dv.getFloat32(0, false);
    case -64:
	return dv.getFloat64(0, false);
    }

    return undefined;
};

Fitsy.readPixel = function (fits, hdu, index, handler) {
    var ptr;
    fits.read.onloadend = function() {
	    fits.pixel = Fitsy.convertPixel(fits.read.result, hdu.bitpix, hdu.bzero || 0);
	    handler();
    };

    // Only works for 2d images
    //
    ptr = hdu.dataseek + (index[0] * hdu.axis[1] + index[1]) * Math.abs(hdu.bitpix/8);

    fits.read.readAsArrayBuffer(Fitsy.getSlice(fits.file, ptr, ptr+Math.abs(hdu.bitpix/8)));
};

Fitsy.defaultDispatchFITS = function (fits, options, handler) { 	// Function to handle FITS when parsed
    var i;
    var hdu;

    var events = options.events || "EVENTS";

    for ( i = 0; i < fits.hdu.length; i++ ) {
	hdu = fits.hdu[i];

	if ( hdu.databytes > 0 ) {
	    if ( hdu.head.SIMPLE || hdu.head.XTENSION === "IMAGE" ) {
		Fitsy.readImageHDUData(fits, hdu, options, handler);
	    }
	    if ( hdu.table && hdu.head.EXTNAME === events ) {
		Fitsy.readTableHDUData(fits, hdu, options, handler);
	    }
	}
    }
};

Fitsy.defaultHandleFITSFiles = function(files, options, handler) {	// Read the headers.
    var i;

    if ( options === undefined ) { options = Fitsy.options; }
    if ( handler === undefined ) { handler = Fitsy.handler; }

    var func = function (fits) {
	Fitsy.defaultDispatchFITS(fits, options, handler);
    };

    for ( i = 0; i < files.length; i++ ) {
	Fitsy.fitsopen(files[i], func);
    }
};


// set default handler for data handler
//
Fitsy.datahandler = function(handler) { Fitsy.handler = handler; };
Fitsy.dataoptions = function(options) { Fitsy.options = options; };

Fitsy.dragenter = function(id, e) { e.stopPropagation(); e.preventDefault(); };
Fitsy.dragover  = function(id, e) { e.stopPropagation(); e.preventDefault(); };
Fitsy.dragexit  = function(id, e) { e.stopPropagation(); e.preventDefault(); };
Fitsy.dragdrop  = function(id, e) { e.stopPropagation(); e.preventDefault();

    Fitsy.defaultHandleFITSFiles(e.target.files || e.dataTransfer.files);
};


Fitsy.options = {
    table: { nx: 1024, ny: 1024, bin: 1
	       , xcol: [ "X", "x" ]
	       , ycol: [ "Y", "y" ] }
};

Fitsy.fetchURL = function(name, url, options, handler) {
    var xhr = new XMLHttpRequest();

    options = options || Fitsy.options;

    xhr.open('GET', url, true);
    xhr.responseType = 'blob';

    xhr.onload = function(e) {
	var blob;
        if ( this.readyState === 4 ) {
	    if ( this.status === 200 || this.status === 0 ) {
	        blob      = new Blob([this.response]);
		blob.name = name;

		if ( options.messages ) { options.messages(""); }

		Fitsy.defaultHandleFITSFiles([blob], options, handler);
	    }
	}
    };
    if ( options.messages ){
	xhr.addEventListener("progress", function(e) { options.messages("progress " + e.loaded.toString()); });
	xhr.addEventListener("error"   , function(e) { options.messages("FITS upload error"); });
	xhr.addEventListener("abort"   , function(e) { options.messages("FITS upload aborted"); });
    }
    xhr.send();
};

