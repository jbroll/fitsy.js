
JS9=../js9
JS9JS=$(JS9)/js/.

all: fitsy.js

lint:
	jslint fitsy.js

install:
	mkdir -p ../js9/plugins/fitsy/
	cp js9fitsy.html ../js9/.
	cp fitsy.js $(JS9JS)
	cp binning.js ../js9/plugins/fitsy/binning.js
	cp decomp/pako_inflate.min.js 	$(JS9JS)
	cp decomp/bzip2.js 		$(JS9JS)

test: FORCE
	NODE_PATH=/home/john/lib/node_modules nodeunit fitsy-test.js

FORCE:

