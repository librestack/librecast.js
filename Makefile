LINTER=jshint
MINIFY=uglifyjs --compress --mangle --

all: lint minify

debug: all
	cp src/librecast.js js/librecast.min.js

.PHONY: lint

lint:
	$(LINTER) src/*.js

minify:
	$(MINIFY) src/librecast.js > js/librecast.min.js
	wc src/librecast.js && wc js/librecast.min.js
