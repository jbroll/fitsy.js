/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $, JS9, Fitsy */

"use strict";

(function() {

    function reBinImage(div, display) {
	var hdu, options;
	var im   = JS9.GetImage({display: display});
	var form = $(div).find(".binning-form")[0];

	if ( !im ) { return; }

	options = $.extend(true, {}, JS9.fits.options,
	      { table: { cx: form.cx.value , cy: form.cy.value,
			 nx: form.nx.value , ny: form.ny.value,
			 bin: form.bin.value , filter: form.filter.value }
	      });

	hdu = im.raw.hdu;

	if ( hdu.type === "image" ) {
	      JS9.error("image binning not implemented");
	} else {
	    switch(JS9.fitsLibrary()){
	    case "fitsy":
		Fitsy.readTableHDUData(hdu.fits, hdu, options, function(hdu){
	            JS9.RefreshImage(hdu, {display: display});
		});
		break;
	    case "cfitsio":
		JS9.fits.getFITSImage(hdu.fits, hdu, options, function(hdu){
		    JS9.RefreshImage(hdu, {display: display});
		});
		break;
	    }
	}
    }

    function getBinParams(div, display) {
	var im, form;
	if ( display === undefined ) {
	    div     = this.div;
	    display = this.display;
	}
	im   = JS9.GetImage({display: display});

	if ( im ) {
	    form = $(div).find(".binning-form")[0];

	    if ( im.raw.hdu !== undefined ) {
		form.rebin.disabled = false;
		form.bin.disabled = false;

	        if ( im.raw.hdu.table !== undefined ) {
		    form.bin.value = im.raw.hdu.table.bin;
		     form.cx.value = im.raw.hdu.table.cx;
		     form.cy.value = im.raw.hdu.table.cy;
		     form.nx.value = im.raw.hdu.table.nx;
		     form.ny.value = im.raw.hdu.table.ny;
		     form.filter.value = im.raw.hdu.table.filter || "";


		     form.cx.disabled = false;
		     form.cy.disabled = false;
		     form.nx.disabled = false;
		     form.ny.disabled = false;
		     form.filter.disabled = false;
		} else {
		    if ( im.raw.hdu.bin !== undefined ) {
			form.bin.value = im.raw.hdu.bin;
		    } else {
			form.bin.value = 1;
		    }

		     form.cx.disabled = true;
		     form.cy.disabled = true;
		     form.nx.disabled = true;
		     form.ny.disabled = true;
		     form.filter.disabled = true;
		}
	    } else {
		form.rebin.disabled = true;
		  form.bin.disabled = true;
	    }
	}
    }

    function binningInit() {
	var div = this.div;
	var display = this.display;
	var win = this.winHandle;
	var disclose = "";
	var im  = JS9.GetImage({display: this.display});

	if( !im || (im && (!im.raw.hdu || !im.raw.hdu.table)) ){
	    div.innerHTML = '<p><center>Binning is available for FITS binary tables.</center>';
	    return;
	}

	if( !win ){
	    disclose = 'disabled="disabled"';
	}

	/*eslint-disable no-multi-str */
	$(div).html('<form class="binning-form" style="margin: 5px">					\
	    <table><tr>	<td>Bin&nbsp;Factor</td>							\
			<td><input type=text name=bin value=1 size=10 style="text-align:right;"></td>	\
			<td>&nbsp;</td>									\
			<td>&nbsp;</td>									\
		   </tr>										\
	           <tr>	<td>Center</td>									\
			<td><input type=text name=cx size=10 style="text-align:right;"></td>		\
			<td><input type=text name=cy size=10 style="text-align:right;"></td>    	\
			<td>&nbsp;</td>									\
		   </tr>										\
	           <tr>	<td>Image&nbsp;Size</td>							\
			<td><input type=text name=nx size=10 style="text-align:right;"></td>		\
			<td><input type=text name=ny size=10 style="text-align:right;"></td>		\
			<td>&nbsp;</td>									\
		   </tr>										\
	           <tr>	<td>Filter</td>									\
			<td colspan="2"><input type=text name=filter size="24" style="text-align:left;"></td>	\
			<td>&nbsp;</td>									\
			<td>&nbsp;</td>									\
		   </tr>										\
	           <tr>	<td>&nbsp;</td>									\
			<td>&nbsp;</td>									\
			<td>&nbsp;</td>									\
			<td>&nbsp;</td>									\
		   </tr>										\
		   <tr>											\
		       	<td><input type=button name=rebin value="Rebin" class="rebin-image"></td>	\
			<td>&nbsp;</td>									\
			<td>&nbsp;</td>									\
		       	<td><input type=button name=close value="Close" class="close-image" ' + disclose + '></td>	\
		   </tr>										\
	    </table>											\
	    </form>');
	/*eslint-enable no-multi-str */

// 	click doesn't work on localhost on a Mac using Chrome/Safari, but mouseup does!
//	$(div).find(".rebin-image").on("click", function () { reBinImage(div, display); });
//	$(div).find(".close-image").on("click", function () { if( win ){ win.close(); } });
	$(div).find(".rebin-image").on("mouseup", function () { reBinImage(div, display); });
	$(div).find(".close-image").on("mouseup", function () { if( win ){ win.close(); } });

	if ( im ) {
	    getBinParams(div, display);
	}
    }

    JS9.RegisterPlugin("Fits", "Binning", binningInit, {
	    menu: "view",

            winTitle: "FITS Binary Table Binning",
	    winResize: true,

            menuItem: "Binning",

	    onplugindisplay:  binningInit,
	    onimageload:      binningInit,
	    onimagedisplay:   binningInit,

	    help:     "fitsy/binning.html",

            winDims: [400, 180]
    });
}());
