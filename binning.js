/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $, JS9 */ 

"use strict";


(function() {

    function reBinImage(div, display) {

    JS9.debug = 2;

	var i, j;
	var im   = JS9.GetImage(display);
	var form = $(div).find(".binning-form")[0];

	if ( !im ) { return; }

	var options = $.extend(true, {}, Fitsy.options
	    , { table: { cx: form.cx.value , cy: form.cy.value  
	    	       , nx: form.nx.value , ny: form.ny.value
		       , bin: form.bin.value }
	      });

	var hdu = im.raw.hdu;

	if ( hdu.head.SIMPLE || hdu.head.XTENSION === "IMAGE" ) {
	    if ( hdu.unbinned === undefined ) {
	    	hdu.unbinned = hdu.data;
	    }

	    var bin = Math.round(Number(form.bin.value));
	    hdu.bin        = bin;
	    form.bin.value = bin;


	    var nx = hdu.head["NAXIS1"]
	    var ny = hdu.head["NAXIS2"]

	    var xx = Math.round(nx/bin);
	    var yy = Math.round(nx/bin);

	    hdu.data = new Float32Array(nx*ny);

	    for ( j = 0; j < ny; j++ ) {
	    for ( i = 0; i < nx; i++ ) {
		hdu.data[Math.floor(j/bin)*xx+Math.floor(i/bin)] += hdu.unbinned[j*nx+i];
	    }
	    }

	    hdu.dmin = Number.MAX_VALUE;
	    hdu.dmax = Number.MIN_VALUE;

	    for ( i = 0; i < xx*yy; i++ ) {
		hdu.dmin    = Math.min(hdu.dmin, hdu.data[i]);
		hdu.dmax    = Math.max(hdu.dmax, hdu.data[i]);
	    }

	    hdu.axis[1] = xx;
	    hdu.axis[2] = yy;
	    hdu.bitpix  = -32;

	    JS9.RefreshImage(display, hdu);
	} else {
	    Fitsy.readTableHDUData(hdu.fits, hdu, options, function (hdu) {
		JS9.RefreshImage(display, hdu);
	    });
	}
    }

    function getBinParams(div, display) {
	if ( display === undefined ) {
	    div     = this.div;
	    display = this.display;
	}
	var im   = JS9.GetImage(display);

	if ( im ) {
	    var form = $(div).find(".binning-form")[0];

	    if ( im.raw.hdu.table !== undefined ) {
		form.bin.value = im.raw.hdu.table.bin;
		 form.cx.value = im.raw.hdu.table.cx;
		 form.cy.value = im.raw.hdu.table.cy;
		 form.nx.value = im.raw.hdu.table.nx;
		 form.ny.value = im.raw.hdu.table.ny;

		 form.cx.disabled = false;
		 form.cy.disabled = false;
		 form.nx.disabled = false;
		 form.ny.disabled = false;
	    } else {
		if ( im.raw.hdu.bin != undefined ) {
		    form.bin.value = im.raw.hdu.bin;
		} else {
		    form.bin.value = 1;
		}

		 form.cx.disabled = true;
		 form.cy.disabled = true;
		 form.nx.disabled = true;
		 form.ny.disabled = true;
	    }
	}
    }


    function binningInit() {
	var im  = JS9.GetImage(this.display);
	var div = this.div;

	div.innerHTML = '<form class="binning-form">							\
	    <table><tr>	<td>Bin Factor</td>								\
			<td><input type=text name=bin value=1 size=10 style="text-align:right;"></td>				\
			<td></td>									\
		       	<td><input type=button value="Rebin Image" class="rebin-image"></td></tr>	\
	           <tr>	<td>Center</td>									\
			<td><input type=text name=cx size=10 style="text-align:right;"></td>					\
			<td><input type=text name=cy size=10 style="text-align:right;"></td></tr>					\
	           <tr>	<td>Image Size</td>								\
			<td><input type=text name=nx size=10 style="text-align:right;"></td>					\
			<td><input type=text name=ny size=10 style="text-align:right;"></td></tr>					\
		   </tr>										\
	    </table>											\
	    <p>												\
	    </form>';

	var display = this.display;

	$(div).find(".rebin-image").click(function () { reBinImage(div, display); });

	if ( im ) {
	    getBinParams(div, display);
	}
    }

    JS9.RegisterPlugin("JS9", "Binning", binningInit, {
	    menu: "view",

            winTitle: "Binning",
            menuItem: "Binning",

	    toolbarSeparate: true,

	    onimageload:    getBinParams,
	    onimagedisplay: getBinParams,

            winDims: [400, 125],
    });
}());
