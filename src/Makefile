CLASSES := channel.js context.js exception.js lcfoot.js lchead.js license.js message.js socket.js util.js

../dist/librecast.js: $(CLASSES)
	cat license.js > $@
	cat globals.js >> $@
	cat lchead.js >> $@
	cat exception.js >> $@
	cat util.js >> $@
	cat message.js >> $@
	cat context.js >> $@
	cat socket.js >> $@
	cat channel.js >> $@
	cat lcfoot.js >> $@
