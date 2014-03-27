

JS9   = ../../js9
JS9JS = $(JS9)/plugins/explorer

all: 	explorer.js 

SOURCES = explorer.jx 

explorer.js : $(SOURCES)
	browserify ./explorer.jx  > explorer.js

lint :
	jslint $(SOURCES)

install:
	@mkdir -p $(JS9JS)
	cp js9explorer.html  						$(JS9)/.
	cp explorer.js       						$(JS9JS)/.
	cp -p SlickGrid/lib/jquery.event.drag-2.2.js      		$(JS9JS)/.
	cp -p SlickGrid/css/smoothness/jquery-ui-1.8.16.custom.css      $(JS9JS)/.
	cp -rp SlickGrid/slick-default-theme.css  			$(JS9JS)/.
	cp -rp SlickGrid/examples/examples.css 				$(JS9JS)/.
	cp -rp SlickGrid/images 					$(JS9JS)/.
	cp -p SlickGrid/slick.grid.css       				$(JS9JS)/.
	cp -p explorer.html     					$(JS9JS)/.

