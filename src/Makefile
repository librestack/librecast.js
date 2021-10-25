CLASSES := channel.js context.js exception.js message.js socket.js util.js

../dist/librecast.js: head.js $(CLASSES) foot.js
	cat head.js > $@
	cat exception.js >> $@
	cat util.js >> $@
	cat message.js >> $@
	cat context.js >> $@
	cat socket.js >> $@
	cat channel.js >> $@
	cat foot.js >> $@
