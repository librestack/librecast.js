LINTER=jshint
MINIFY=uglifyjs --compress='drop_console true, warnings true' --mangle --

all: .git/hooks/pre-commit lint minify

debug: all
	cp src/librecast.js js/librecast.min.js

.git/hooks/pre-commit: hooks/pre-commit
	cp hooks/pre-commit .git/hooks/pre-commit
	chmod 755 .git/hooks/pre-commit

.PHONY: lint

lint:
	$(LINTER) src/*.js

minify:
	$(MINIFY) src/librecast.js > js/librecast.min.js
	wc src/librecast.js && wc js/librecast.min.js
