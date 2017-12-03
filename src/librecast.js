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

lc.ERR_SUCCESS = 0;
lc.ERR_FAILURE = 1;
lc.ERR_WEBSOCKET_UNSUPPORTED = 2;
lc.ERR_WEBSOCKET_NOTREADY = 3;
lc.ERR_CALLBACK_NOT_FUNCTION = 4;
lc.ERR_MISSING_ARG = 5;

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

lc.QUERY_NOOP = 0;
lc.QUERY_EQ = 1;
lc.QUERY_NE = 2;
lc.QUERY_LT = 4;
lc.QUERY_GT = 8;
lc.QUERY_TIME = 16;
lc.QUERY_SRC = 32;
lc.QUERY_DST = 64;
lc.QUERY_CHANNEL = 128;
lc.QUERY_DB = 256;
lc.QUERY_KEY = 512;
lc.QUERY_MIN = 1024;
lc.QUERY_MAX = 2048;

lc.HEADER_LENGTH = 25;

lc.ErrorMsg = {};
lc.ErrorMsg[lc.ERR_SUCCESS] = "Success";
lc.ErrorMsg[lc.ERR_FAILURE] = "Failure";
lc.ErrorMsg[lc.ERR_WEBSOCKET_UNSUPPORTED] = "Browser does not support websockets";
lc.ErrorMsg[lc.ERR_WEBSOCKET_NOTREADY] = "Websocket not ready";
lc.ErrorMsg[lc.ERR_CALLBACK_NOT_FUNCTION] = "Callback not a function";
lc.ErrorMsg[lc.ERR_MISSING_ARGUMENT] = "Required argument is missing";

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
/* returns goog.math.Long(), as js doesn't support 64 bit integers directly */
if (DataView.prototype.getUint64 === undefined) {
	DataView.prototype.getUint64 = function (byteOffset, littleEndian) {
		var lo = (littleEndian) ? 0 : 4;
		var hi = (littleEndian) ? 4 : 0;

		var x = new goog.math.Long(this.getUint32(byteOffset + hi, littleEndian)).shiftLeft(32);
		var y = new goog.math.Long(this.getUint32(byteOffset + lo, littleEndian));

		return x.or(y);
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

LibrecastCallback.prototype.trigger = function () {

	if (typeof lcastCallbacks[this.token] === 'undefined') {
		console.log("callback " + this.token + " undefined. Skipping.");
		return false;
	}
	console.log("callback " + this.token + " triggered");
	if (typeof(this.callback) === 'function') {
		var args = [].slice.call(arguments);
		args.unshift(this);
		this.callback.apply(this.obj, args);
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


//
// Librecast.Context -----------------------------------------------------------
//

lc.Context = function(onready) {
	console.log("Librecast context constructor");

	this.url = (location.protocol == 'https:') ? "wss://" :  "ws://";
	this.url += document.location.host + "/";

	/* check for websocket browser support */
	if (window.WebSocket) {
		console.log("websockets supported");
	}
	else {
		console.log("websockets unsupported");
		throw new LibrecastException(lc.ERR_WEBSOCKET_UNSUPPORTED);
	}

	this.id = undefined;

	/* user callback functions */
	this.onmessage = null;
	this.onready = onready;

	/* prepare websocket */
	this.init();

	this.defer = defer();
};

lc.Context.prototype.init = function() {
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

lc.Context.prototype.close = function() {
	console.log("Librecast close()");
	this.websocket.close();
};

lc.Context.prototype.wsClose = function(e) {
	console.log("websocket close: (" + e.code + ") " + e.reason);
	console.log("websocket.readyState: " + this.websocket.readyState);
	console.log("reinitializing websocket");
	this.init();
};

lc.Context.prototype.wsError = function(e) {
	console.log("websocket error" + e.message);
	console.log("websocket.readyState: " + this.websocket.readyState);
};

lc.Context.prototype.wsMessage = function(msg) {
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
			var timestamp = dataview.getUint64(17);

			console.log("opcode: " + opcode);
			console.log("len: " + len);
			console.log("id: " + id);
			console.log("id2: " + id2);
			console.log("token: " + token);
			console.log("timestamp: " + timestamp.toString());
			if (len > 0) {
				if (opcode === lc.OP_CHANNEL_SETVAL) {
					var keylen = dataview.getUint64(lc.HEADER_LENGTH).getLowBits();
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
				cb.trigger(opcode, len, id, token, key, val, timestamp);
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

lc.Context.prototype.wsOpen = function(e) {
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

lc.Context.prototype.send = function(obj, opcode, callback, data, len, temp) {
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
		idx = lc.HEADER_LENGTH + len;
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


//
// Librecast.Channel -----------------------------------------------------------
//

lc.Channel = function(lctx, name, onready) {
	console.log("Channel constructor");

	if (name == undefined) { throw new LibrecastException(lc.ERR_MISSING_ARG); }

	this.lctx = lctx;
	this.id = undefined;
	this.ws = lctx.websocket;
	this.name = name;
	var cb = new LibrecastCallback(this, null, onready);
	this.onready = cb;
	lctx.send(this, lc.OP_CHANNEL_NEW, this.ready, name, name.length);

	this.defer = defer();
};

lc.Channel.prototype.bindSocket = function(sock, callback) {
	console.log("binding channel " + this.name + " to socket " + sock.id);
	this.id = this.id;
	this.id2 = sock.id;
	this.lctx.send(this, lc.OP_CHANNEL_BIND, callback);
};

lc.Channel.prototype.join = function(callback) {
	console.log('joining channel "' + this.name + '"');
	this.lctx.send(this, lc.OP_CHANNEL_JOIN, callback);
};

lc.Channel.prototype.joined = function() {
	console.log('joined channel "' + this.name + '"');
};

lc.Channel.prototype.part = function() {
	console.log('parting channel "' + this.name + '"');
	this.lctx.send(this, lc.OP_CHANNEL_PART, this.parted);
};

lc.Channel.prototype.parted = function() {
	console.log('parted channel "' + this.name + '"');
};

lc.Channel.prototype.ready = function(cb, opcode, len, id) {
	console.log("callback with opcode " + cb.opcode + " and token " + cb.token);
	console.log("setting channel id to " + id);

	var self = cb.obj;
	self.id = id;
	if (self.defer) {
		console.log("resolving Channel.defer");
		self.defer.resolve();
	}
	self.onready.trigger();
};

lc.Channel.prototype.getmsg = function(cb, qry) {
	console.log("channel getmsgs");

	if (typeof qry === 'undefined') { qry = new lc.Query(); }
	this.lctx.send(this, lc.OP_CHANNEL_GETMSG, cb, qry.packed(), qry.size);
};

lc.Channel.prototype.getval = function(key, cb) {
	console.log("channel getval '" + key + "'");

	/* set up callback, and send request */
	this.lctx.send(this, lc.OP_CHANNEL_GETVAL, cb, key, key.length, true);
};

lc.Channel.prototype.setval = function(key, val, cb) {
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

lc.Channel.prototype.send = function(msg) {
	if (this.lctx.websocket.readyState == lc.WS_OPEN) {
		console.log('sending on channel "' + this.name + '": ' + msg);
		this.lctx.send(this, lc.OP_CHANNEL_SEND, null, msg, msg.length);
	}
	else {
		throw new LibrecastException(lc.ERR_WEBSOCKET_NOTREADY);
	}
};

//
// Librecast.Socket ------------------------------------------------------------
//

lc.Socket = function(lctx, onready) {
	console.log("Socket constructor");
	this.lctx = lctx;
	this.id = undefined;
	var cb = new LibrecastCallback(this, null, onready, true);
	this.onready = cb;
	this.onmessage = undefined;
	lctx.send(this, lc.OP_SOCKET_NEW, this.ready);
	this.defer = defer();
};

lc.Socket.prototype.listen = function (callback) {
	this.lctx.send(this, lc.OP_SOCKET_LISTEN, callback);
};

lc.Socket.prototype.ready = function (cb, opcode, len, id) {
	console.log("Socket.ready()");

	var self = cb.obj;
	self.id = id;
	if (self.defer) {
		console.log("resolving Socket.defer");
		self.defer.resolve();
	}
	self.onready.trigger();
};


//
// Librecast.Query -------------------------------------------------------------
//

lc.Query = function() {
	this.filters = [];
	this.size = 0;
	return this;
};

lc.Query.prototype.key = function(db, key) {
	if (db && key) {
		this.filters.push({ "type": lc.QUERY_DB, "key": db });
		this.filters.push({ "type": lc.QUERY_KEY, "key": key });
		this.size += db.length + key.length + 12;
	}
	return this;
};

lc.Query.prototype.timestamp = function(timestamp, op) {
	if (typeof timestamp !== 'undefined') {
		if (typeof op === 'undefined') op = lc.QUERY_EQ;
		op |= lc.QUERY_TIME;
		this.filters.push({ "type": op, "key": timestamp });
		this.size += timestamp.length + 6;
	}
	return this;
};

lc.Query.prototype.packed = function() {
	if (!this.size) return "";
	var buffer = new ArrayBuffer(this.size);
	var dataview = new DataView(buffer);
	var idx = 0;

	for (var i = 0; i < this.filters.length; i++) {
		// [opcode][len][key]
		var key = this.filters[i].key;
		var type = this.filters[i].type;
		dataview.setUint16(idx, type);
		idx += 2;
		dataview.setUint32(idx, key.length);
		console.log("nightwork: " + type);
		console.log("nightwork: " + key.length);
		idx += 4;
		idx = convertUTF16toUTF8(idx, key, key.length, dataview);
	}

	return buffer;
};


return lc;

}(jQuery));
