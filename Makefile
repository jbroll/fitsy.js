
JS9=../js9
JS9JS=$(JS9)/js/.

all: fitsy.js

lint:
	jslint fitsy.js

install:
	cp fitsy.js $(JS9JS)
	cp node_modules/pako/dist/pako_inflate.min.js $(JS9JS)

