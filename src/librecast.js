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

const WS_CONNECTING = 0;
const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

const LC_ERROR_SUCCESS = 0;
const LC_ERROR_FAILURE = 1;
const LC_ERROR_WEBSOCKET_UNSUPPORTED = 2;
const LC_ERROR_WEBSOCKET_NOTREADY = 3;

var librecastErrorMsg = {};
librecastErrorMsg[LC_ERROR_SUCCESS] = "Success";
librecastErrorMsg[LC_ERROR_FAILURE] = "Failure";
librecastErrorMsg[LC_ERROR_WEBSOCKET_UNSUPPORTED] = "Browser does not support websockets";
librecastErrorMsg[LC_ERROR_WEBSOCKET_NOTREADY] = "Websocket not ready";


function LibrecastException(errorCode) {
	this.code = errorCode;
	this.name = librecastErrorMsg[errorCode];
	this.errormsg = "ERROR (" + this.code + ") " + this.name;
}


function Librecast(url) {
	console.log("Librecast constructor");

	/* check for websocket browser support */
	if (window.WebSocket) {
		console.log("websockets supported");
	}
    else {
		console.log("websockets unsupported");
		throw LibrecastException(LC_ERROR_WEBSOCKET_UNSUPPORTED);
	}
    this.url = url

	/* user callback functions */
	this.onmessage = null;
	this.onready = null;

	/* prepare websocket */
	this.websocket = new WebSocket(url, "librecast");
    var self = this;
	this.websocket.onclose = function(e) { self.wsClose(e); }
	this.websocket.onerror = function(e) { self.wsError(e); }
	this.websocket.onmessage = function(e) { self.wsMessage(e); }
	this.websocket.onopen = function(e) { self.wsOpen(e); }
}

Librecast.prototype.close = function() {
	console.log("Librecast close()");
	this.websocket.close();
}

Librecast.prototype.wsClose = function(e) {
	console.log("websocket close: (" + e.code + ") " + e.reason);
	console.log("websocket.readyState: " + this.websocket.readyState);
}

Librecast.prototype.wsError = function(e) {
	console.log("websocket error") + e.message;
	console.log("websocket.readyState: " + this.websocket.readyState);
}

Librecast.prototype.wsMessage = function(msg) {
	console.log("websocket message received");
	this.onmessage(msg); /* callback */
}

Librecast.prototype.wsOpen = function(e) {
	console.log("websocket open");
	console.log("websocket.readyState: " + this.websocket.readyState);
	this.onready(); /* callback */
}


function Channel(lctx, name) {
	console.log("Channel constructor");
	this.lctx = lctx;
	this.ws = lctx.websocket;
	this.name = name;
}

Channel.prototype.join = function() {
	console.log('joining channel "' + this.name + '"');
	this.ws.send("/join " + this.name);
}

Channel.prototype.part = function() {
	console.log('leaving channel "' + this.name + '"');
	this.ws.send("/part " + this.name);
}

Channel.prototype.send = function(msg) {
	if (this.lctx.websocket.readyState == WS_OPEN) {
		console.log('sending on channel "' + this.name + '"');
		this.ws.send(msg);
	}
	else {
		throw new LibrecastException(LC_ERROR_WEBSOCKET_NOTREADY);
	}
}
