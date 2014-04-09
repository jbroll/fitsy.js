/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $, JS9 */ 

"use strict";


(function() {

    function reBinImage(div, display) {
	var i;
	var im   = JS9.GetImage(display);
	var form = $(div).find(".binning-form")[0];

	if ( !im ) { return; }

	var options = $.extend(true, {}, Fitsy.options
	    , { table: { cx: form.cx.value , cy: form.cy.value  
	    	       , nx: form.nx.value , ny: form.ny.value
		       , bin: form.bin.value }
	      });

	var hdu = im.raw.hdu;

	Fitsy.readTableHDUData(hdu.fits, hdu, options, function (hdu) {
	    JS9.Load(hdu, { display: display });
	});
    }

    function getBinParams(div, display) {
	if ( display === undefined ) {
	    div     = this.div;
	    display = this.display;
	}
	var im   = JS9.GetImage(display);

	if ( im ) {
	    var form = $(div).find(".binning-form")[0];

	    form.bin.value = im.raw.hdu.table.bin;
	     form.cx.value = im.raw.hdu.table.cx;
	     form.cy.value = im.raw.hdu.table.cy;
	     form.nx.value = im.raw.hdu.table.nx;
	     form.ny.value = im.raw.hdu.table.ny;
	}
    }


    function binningInit() {
	var im  = JS9.GetImage(this.display);
	var div = this.div;

	div.innerHTML = '<form class="binning-form">							\
	    <table><tr>	<td>Bin Factor</td>								\
			<td><input type=text name=bin value=1 size=10 style="text-align:right;"></td>				\
			<td></td>									\
		       	<td><input type=button value="ReBin Image" class="rebin-image"></td></tr>	\
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
	    toolbarHTML: " ",

	    imageload:    getBinParams,
	    imagedisplay: getBinParams,

            winDims: [350, 100],
    });
}());
