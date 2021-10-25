CLASSES := context.js message.js socket.js channel.js

../dist/librecast.js: head.js $(CLASSES) foot.js
	cat head.js > $@
	cat util.js >> $@
	cat message.js >> $@
	cat context.js >> $@
	cat socket.js >> $@
	cat channel.js >> $@
	cat foot.js >> $@
