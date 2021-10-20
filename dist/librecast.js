/* 
 * librecast.js - librecast helper functions
 *
 * this file is part of LIBRECAST
 *
 * Copyright (c) 2017-2021 Brett Sheffield <brett@librecast.net>
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

var LIBRECAST = (function () {

"use strict";
var lc = {};

//
// Librecast.Context -----------------------------------------------------------
//

var lc = {};

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

	//this.defer = defer();
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
/*
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
		//this.onmessage(msg); // callback
		console.log(msg);
	}
	return defer();
};
*/

lc.Context.prototype.wsOpen = function(e) {
	console.log("websocket open");
	console.log("websocket.readyState: " + this.websocket.readyState);
	/*
	if (this.defer) {
		console.log("resolving Librecast.defer");
		this.defer.resolve();
	}
	*/
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

return lc;

}());
