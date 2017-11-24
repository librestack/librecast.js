/* 
 * librecast.js - librecast helper functions
 *
 * this file is part of LIBRECAST
 *
 * Copyright (c) 2017 Brett Sheffield <brett@gladserv.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program (see the file COPYING in the distribution).
 * If not, see <http://www.gnu.org/licenses/>.
 */

var LIBRECAST = (function ($) {

"use strict";
var lc = {};

lc.WS_CONNECTING = 0;
lc.WS_OPEN = 1;
lc.WS_CLOSING = 2;
lc.WS_CLOSED = 3;

lc.ERROR_SUCCESS = 0;
lc.ERROR_FAILURE = 1;
lc.ERROR_WEBSOCKET_UNSUPPORTED = 2;
lc.ERROR_WEBSOCKET_NOTREADY = 3;
lc.ERROR_CALLBACK_NOT_FUNCTION = 4;

lc.OP_NOOP			  = 0x01;
lc.OP_SETOPT			  = 0x02;
lc.OP_SOCKET_NEW		  = 0x03;
lc.OP_SOCKET_GETOPT	  = 0x04;
lc.OP_SOCKET_SETOPT	  = 0x05;
lc.OP_SOCKET_LISTEN	  = 0x06;
lc.OP_SOCKET_IGNORE	  = 0x07;
lc.OP_SOCKET_CLOSE	  = 0x08;
lc.OP_SOCKET_MSG		  = 0x09;
lc.OP_CHANNEL_NEW	  = 0x0a;
lc.OP_CHANNEL_GETMSG   = 0x0b;
lc.OP_CHANNEL_GETOPT   = 0x0c;
lc.OP_CHANNEL_SETOPT   = 0x0d;
lc.OP_CHANNEL_GETVAL   = 0x0e;
lc.OP_CHANNEL_SETVAL   = 0x0f;
lc.OP_CHANNEL_BIND	  = 0x10;
lc.OP_CHANNEL_UNBIND   = 0x11;
lc.OP_CHANNEL_JOIN	  = 0x12;
lc.OP_CHANNEL_PART	  = 0x13;
lc.OP_CHANNEL_SEND	  = 0x14;

lc.HEADER_LENGTH = 25;

lc.ErrorMsg = {};
lc.ErrorMsg[lc.ERROR_SUCCESS] = "Success";
lc.ErrorMsg[lc.ERROR_FAILURE] = "Failure";
lc.ErrorMsg[lc.ERROR_WEBSOCKET_UNSUPPORTED] = "Browser does not support websockets";
lc.ErrorMsg[lc.ERROR_WEBSOCKET_NOTREADY] = "Websocket not ready";
lc.ErrorMsg[lc.ERROR_CALLBACK_NOT_FUNCTION] = "Callback not a function";

var tok = 42;
var lcastCallbacks = {};
lc.HAS_JQUERY = (typeof jQuery !== "undefined");


/* convert utf16 to utf8 and append to dataview
 * idx:		 starting byte in dataview to write to
 * utf16in:  utf16 input
 * len:		 length (characters) of utf16in
 * dataview: DataView array to write to
 * returns: index of last byte written in dataview */
function convertUTF16toUTF8(idx, utf16in, len, dataview) {
	var c, i;
	for (i = 0; i < len; i++) {
		c = utf16in.charCodeAt(i);
		if (c <= 0x7f) {
			dataview.setUint8(idx++, c);
		}
		else if (c <= 0x7ff) {
			dataview.setUint8(idx++, 0xc0 | (c >>> 6));
			dataview.setUint8(idx++, 0x80 | (c & 0x3f));
		}
		else if (c <= 0xffff) {
			dataview.setUint8(idx++, 0xe0 | (c >>> 12));
			dataview.setUint8(idx++, 0x80 | ((c >>> 6) & 0x3f));
			dataview.setUint8(idx++, 0x80 | (c & 0x3f));
		}
		else {
			console.log("UTF-16 surrogate pair, ignoring");
			/* TODO: 4 byte UTF-8 encoding, just in case anyone speaks Vogon */
		}
	}
	return idx;
}


/* return deferred if jQuery available */
function defer() {
	if (lc.HAS_JQUERY) {
		console.log("jQuery available, returning deferred");
		try {
			return $.Deferred();
		}
		catch(e) {
			console.log("unable to set deferred");
		}
	}
}


/* extend DataView to provide missing getUint64() */
/* this function based on code from spice-html5
 * https://github.com/SPICE/spice-html5/blob/master/spicedataview.js
 * Copyright (C) 2013 by Jeremy P. White <jwhite@codeweavers.com>
 * License: LGPL3+ */
if (DataView.prototype.getUint64 === undefined) {
	DataView.prototype.getUint64 = function (byteOffset, littleEndian) {
		var lo = (littleEndian) ? 0 : 4;
		var hi = (littleEndian) ? 4 : 0;

		return (this.getUint32(byteOffset + hi, littleEndian) << 32) |
				this.getUint32(byteOffset + lo, littleEndian);
	};
}


function LibrecastCallback(obj, opcode, callback, temp) {
	this.obj = obj;
	this.opcode = opcode;
	this.token = tok++;
	this.temp = temp; /* delete this callback when done */
	lcastCallbacks[this.token] = this;
	if (typeof(callback) === 'function') {
		this.callback = callback;
	}
}

LibrecastCallback.prototype.call = function () {

	if (typeof lcastCallbacks[this.token] === 'undefined') {
		console.log("callback " + this.token + " undefined. Skipping.");
		return false;
	}
	console.log("callback " + this.token + " triggered");
	if (typeof(this.callback) === 'function') {
		var args = [].slice.call(arguments);
		args.unshift(this);
		this.callback.apply(this, args);
	}
	if (this.temp) {
		console.log("Deleting callback token " + this.token);
		delete lcastCallbacks[this.token];
	}
};


function LibrecastException(errorCode) {
	this.code = errorCode;
	this.name = lc.ErrorMsg[errorCode];
	this.errormsg = "ERROR (" + this.code + ") " + this.name;
}


lc.Librecast = function(onready) {
	console.log("Librecast constructor");

	this.url = (location.protocol == 'https:') ? "wss://" :  "ws://";
	this.url += document.location.host + "/";

	/* check for websocket browser support */
	if (window.WebSocket) {
		console.log("websockets supported");
	}
	else {
		console.log("websockets unsupported");
		throw new LibrecastException(ERROR_WEBSOCKET_UNSUPPORTED);
	}

	this.id = undefined;

	/* user callback functions */
	this.onmessage = null;
	this.onready = onready;

	/* prepare websocket */
	this.init();

	this.defer = defer();
};

lc.Librecast.prototype.init = function() {
	console.log("Librecast.init()");
	/* prepare websocket */
	var self = this;
	this.websocket = new WebSocket(this.url, "librecast");
	this.websocket.binaryType = 'arraybuffer';
	this.websocket.onclose = function(e) { self.wsClose(e); };
	this.websocket.onerror = function(e) { self.wsError(e); };
	this.websocket.onmessage = function(e) { self.wsMessage(e); };
	this.websocket.onopen = function(e) { self.wsOpen(e); };
};

lc.Librecast.prototype.close = function() {
	console.log("Librecast close()");
	this.websocket.close();
};

lc.Librecast.prototype.wsClose = function(e) {
	console.log("websocket close: (" + e.code + ") " + e.reason);
	console.log("websocket.readyState: " + this.websocket.readyState);
	console.log("reinitializing websocket");
	this.init();
};

lc.Librecast.prototype.wsError = function(e) {
	console.log("websocket error" + e.message);
	console.log("websocket.readyState: " + this.websocket.readyState);
};

lc.Librecast.prototype.wsMessage = function(msg) {
	console.log("websocket message received (type=" + msg.type +")");
	var key, val;
	if (typeof(msg) === 'object') {
		if (msg.data instanceof ArrayBuffer) {
			var dataview = new DataView(msg.data);
			var opcode = dataview.getUint8(0);
			var len = dataview.getUint32(1);
			var id = dataview.getUint32(5);
			var id2 = dataview.getUint32(9);
			var token = dataview.getUint32(13);
			var timestamp = dataview.getUint64(17) * 1000; /* s -> ms */

			console.log("opcode: " + opcode);
			console.log("len: " + len);
			console.log("id: " + id);
			console.log("id2: " + id2);
			console.log("token: " + token);
			console.log("timestamp: " + timestamp);
			if (len > 0) {
				if (opcode === lc.OP_CHANNEL_SETVAL) {
					var keylen = dataview.getUint64(lc.HEADER_LENGTH);
					key = new StringView(msg.data, "UTF-8", lc.HEADER_LENGTH + 8, keylen);
					val = new StringView(msg.data, "UTF-8", lc.HEADER_LENGTH + 8 + keylen);
				}
				else {
					var sv = new StringView(msg.data, "UTF-8", lc.HEADER_LENGTH, len);
					val = sv.toString();
				}
			}
			var cb = lcastCallbacks[token];
			if (cb)
				cb.call(opcode, len, id, token, key, val, timestamp);
			else
				console.log("message with no matching callback token '" + token + "'");
		}
	}
	else if (typeof(this.onmessage) === 'function') {
		//this.onmessage(msg); /* callback */
		console.log(msg);
	}
	return defer();
};

lc.Librecast.prototype.wsOpen = function(e) {
	console.log("websocket open");
	console.log("websocket.readyState: " + this.websocket.readyState);
	if (this.defer) {
		console.log("resolving Librecast.defer");
		this.defer.resolve();
	}
	if (typeof(this.onready) === 'function') {
		this.onready(); /* callback */
	}
};

lc.Librecast.prototype.send = function(obj, opcode, callback, data, len, temp) {
	if (typeof len === 'undefined') { len = 0; }
	var id = obj.id;
	var id2 = obj.id2;
	if (typeof obj.id === 'undefined') { id = 0; }
	if (typeof obj.id2 === 'undefined') { id2 = 0;}
	var cb = new LibrecastCallback(obj, opcode, callback, temp);
	var buffer, dataview, idx;

	console.log("sending message (" + opcode + ") with token '" + cb.token	+ "'");

	if (typeof data === 'object') {
		/* copy ArrayBuffer into new buffer with space for header data */
		idx = HEADER_LENGTH + len;
		var tmp = new Uint8Array(idx);
		tmp.set(new Uint8Array(data), lc.HEADER_LENGTH);
		buffer = tmp.buffer;
		dataview = new DataView(buffer);
	}
	else {
		/* string data, convert to UTF-8 */
		buffer = new ArrayBuffer(lc.HEADER_LENGTH + len * 4);
		dataview = new DataView(buffer);
		idx = convertUTF16toUTF8(lc.HEADER_LENGTH, data, len, dataview);
	}

	/* write headers */
	dataview.setUint8(0, opcode);
	dataview.setUint32(1, idx - lc.HEADER_LENGTH);
	dataview.setUint32(5, id);
	dataview.setUint32(9, id2);
	dataview.setUint32(13, cb.token);

	/* send */
	this.websocket.send(buffer);
};


lc.LibrecastChannel = function(lctx, name, onready) {
	console.log("Channel constructor");
	this.lctx = lctx;
	this.id = undefined;
	this.ws = lctx.websocket;
	this.name = name;
	var cb = new LibrecastCallback(this, null, onready);
	this.onready = cb;
	lctx.send(this, lc.OP_CHANNEL_NEW, this.ready, name, name.length);

	this.defer = defer();
};

lc.LibrecastChannel.prototype.bind = function(sock, callback) {
	console.log("binding channel " + this.name + " to socket " + sock.id);
	this.id = this.id;
	this.id2 = sock.id;
	this.lctx.send(this, lc.OP_CHANNEL_BIND, callback);
};

lc.LibrecastChannel.prototype.bound = function() {
	console.log('bound channel');
};

lc.LibrecastChannel.prototype.join = function(callback) {
	console.log('joining channel "' + this.name + '"');
	this.lctx.send(this, lc.OP_CHANNEL_JOIN, callback);
};

lc.LibrecastChannel.prototype.joined = function() {
	console.log('joined channel "' + this.name + '"');
};

lc.LibrecastChannel.prototype.part = function() {
	console.log('parting channel "' + this.name + '"');
	this.lctx.send(this, lc.OP_CHANNEL_PART, this.parted);
};

lc.LibrecastChannel.prototype.parted = function() {
	console.log('parted channel "' + this.name + '"');
};

lc.LibrecastChannel.prototype.ready = function(cb, opcode, len, id) {
	console.log("callback with opcode " + cb.opcode + " and token " + cb.token);
	console.log("setting channel id to " + id);

	var self = cb.obj;
	self.id = id;
	if (self.defer) {
		console.log("resolving Channel.defer");
		self.defer.resolve();
	}
	self.onready.call();
};

lc.LibrecastChannel.prototype.getmsg = function(cb) {
	console.log("channel getmsgs");

	/* TODO: filters (msgs since last received etc.) */

	/* send query */
	var key = "";
	this.lctx.send(this, lc.OP_CHANNEL_GETMSG, cb, key, key.length);
};

lc.LibrecastChannel.prototype.getval = function(key, cb) {
	console.log("channel getval '" + key + "'");

	/* set up callback, and send request */
	this.lctx.send(this, lc.OP_CHANNEL_GETVAL, cb, key, key.length, true);
};

lc.LibrecastChannel.prototype.setval = function(key, val, cb) {
	console.log("channel setval '" + key + "': '" + val + "'");

	var klen = key.length;
	var vlen = val.length;
	var buflen = 4 + (klen + vlen) * 4; /* allow up to 4 bytes per character */
	var buffer = new ArrayBuffer(buflen);
	var dataview = new DataView(buffer);
	var idx = 4;

	/* pack data and send */
	/* [keylen][key][val] */
	dataview.setUint32(0, klen);
	idx = convertUTF16toUTF8(idx, key, klen, dataview);
	idx = convertUTF16toUTF8(idx, val, vlen, dataview);
	this.lctx.send(this, lc.OP_CHANNEL_SETVAL, cb, buffer, buflen, true);
};

lc.LibrecastChannel.prototype.send = function(msg) {
	if (this.lctx.websocket.readyState == lc.WS_OPEN) {
		console.log('sending on channel "' + this.name + '": ' + msg);
		this.lctx.send(this, lc.OP_CHANNEL_SEND, null, msg, msg.length);
	}
	else {
		throw new LibrecastException(ERROR_WEBSOCKET_NOTREADY);
	}
};

lc.LibrecastSocket = function(lctx, onready) {
	console.log("Socket constructor");
	this.lctx = lctx;
	this.id = undefined;
	var cb = new LibrecastCallback(this, null, onready, true);
	this.onready = cb;
	this.onmessage = undefined;
	lctx.send(this, lc.OP_SOCKET_NEW, this.ready);
	this.defer = defer();
};

lc.LibrecastSocket.prototype.listen = function (callback) {
	this.lctx.send(this, lc.OP_SOCKET_LISTEN, callback);
};

lc.LibrecastSocket.prototype.ready = function (cb, opcode, len, id) {
	console.log("Socket.ready()");

	var self = cb.obj;
	self.id = id;
	if (self.defer) {
		console.log("resolving Socket.defer");
		self.defer.resolve();
	}
	self.onready.call();
};

return lc;

}(jQuery));
