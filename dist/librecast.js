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

const LIBRECAST = (function () {

"use strict";

var lc = {};

// default op callback timeout in ms
lc.DEFAULT_TIMEOUT = 5000;

lc.NO_TIMEOUT = -1;

lc.WS_CONNECTING = 0;
lc.WS_OPEN = 1;
lc.WS_CLOSING = 2;
lc.WS_CLOSED = 3;

lc.OP_NOOP              = 0x01;
lc.OP_SETOPT            = 0x02;
lc.OP_SOCKET_NEW        = 0x03;
lc.OP_SOCKET_GETOPT     = 0x04;
lc.OP_SOCKET_SETOPT     = 0x05;
lc.OP_SOCKET_LISTEN     = 0x06;
lc.OP_SOCKET_IGNORE     = 0x07;
lc.OP_SOCKET_CLOSE      = 0x08;
lc.OP_SOCKET_MSG        = 0x09;
lc.OP_CHANNEL_NEW       = 0x0a;
lc.OP_CHANNEL_GETMSG    = 0x0b;
lc.OP_CHANNEL_GETOPT    = 0x0c;
lc.OP_CHANNEL_SETOPT    = 0x0d;
lc.OP_CHANNEL_GETVAL    = 0x0e;
lc.OP_CHANNEL_SETVAL    = 0x0f;
lc.OP_CHANNEL_BIND      = 0x10;
lc.OP_CHANNEL_UNBIND    = 0x11;
lc.OP_CHANNEL_JOIN      = 0x12;
lc.OP_CHANNEL_PART      = 0x13;
lc.OP_CHANNEL_SEND      = 0x14;

lc.HEADER_LENGTH = 25;

lc.ERR_SUCCESS = 0;
lc.ERR_FAILURE = 1;
lc.ERR_WEBSOCKET_UNSUPPORTED = 2;
lc.ERR_WEBSOCKET_NOTREADY = 3;
lc.ERR_CALLBACK_NOT_FUNCTION = 4;
lc.ERR_MISSING_ARG = 5;

lc.ErrorMsg = {};
lc.ErrorMsg[lc.ERR_SUCCESS] = "Success";
lc.ErrorMsg[lc.ERR_FAILURE] = "Failure";
lc.ErrorMsg[lc.ERR_WEBSOCKET_UNSUPPORTED] = "Browser does not support websockets";
lc.ErrorMsg[lc.ERR_WEBSOCKET_NOTREADY] = "Websocket not ready";
lc.ErrorMsg[lc.ERR_CALLBACK_NOT_FUNCTION] = "Callback not a function";
lc.ErrorMsg[lc.ERR_MISSING_ARGUMENT] = "Required argument is missing";

function LibrecastException(errorCode) {
	this.code = errorCode;
	this.name = lc.ErrorMsg[errorCode];
	this.errormsg = "ERROR (" + this.code + ") " + this.name;
}
const UINT32_MAX = 4294967295;

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
lc.Message = class {
	constructor(data) {
		this.opcode = lc.OP_NOOP;
		this.data = data;
		this.len = (this.data === undefined) ? 0 : data.length;
		this.id = 0;
		this.id2 = 0;
		this.token = 0;
	};

	get utf8() {
		if (this.data !== undefined) {
			const sv = new StringView(this.data, "UTF-8", lc.HEADER_LENGTH, this.len);
			return sv.toString();
		}
	}
};
//
// Librecast.Context -----------------------------------------------------------
//

lc.Context = class {

	constructor() {
		console.log("Librecast context constructor");
		this.tok = 0;
		this.url = (location.protocol == 'https:') ? "wss://" :  "ws://";
		this.url += document.location.host + "/";
		this.callstack = [];
		this.onconnect = new Promise(resolve => { this.resolveconnect = resolve; });
		this.connect();
	};

	connect() {
		console.log("Librecast.connect()");

		if (window.WebSocket) {
			console.log("websockets supported");
		}
		else {
			console.log("websockets unsupported");
			throw new LibrecastException(lc.ERR_WEBSOCKET_UNSUPPORTED);
		}

		this.websocket = new WebSocket(this.url, "librecast");
		this.websocket.binaryType = 'arraybuffer';
		this.websocket.onclose = (e) => { this.wsClose(e); };
		this.websocket.onerror = (e) => { this.wsError(e); };
		this.websocket.onmessage = (e) => { this.wsMessage(e); };
		this.websocket.onopen = (e) => { this.wsOpen(e); };
	};

	close() {
		console.log("Librecast close()");
		this.websocket.close();
	};

	get token() {
		if (++this.tok >= UINT32_MAX) this.tok = 0;
		return this.tok;
	};

	callback(resolve, reject, timeout) {
		const token = this.token;
		const cb = {};
		cb.resolve = resolve;
		cb.reject = reject;
		cb.created = Date.now();
		this.callstack[token] = cb;
		console.log("callback created with token = " + token);
		if (timeout !== lc.NO_TIMEOUT) {
			if (timeout === undefined) { timeout = lc.DEFAULT_TIMEOUT; };
			console.log("setting callback timer " + token);
			cb.timeout = setTimeout( () => {
				reject("callback (" + token + ") timeout");
				delete this.callstack[token];
			}, timeout);
		}
		return token;
	};

	send(msg) {
		let buffer, dataview, idx;
		buffer = new ArrayBuffer(lc.HEADER_LENGTH + msg.len * 4);
		dataview = new DataView(buffer);
		if (msg.data !== undefined && msg.len > 0) {
			idx = convertUTF16toUTF8(lc.HEADER_LENGTH, msg.data, msg.len, dataview);
		}
		dataview.setUint8(0, msg.opcode);
		dataview.setUint32(1, idx - lc.HEADER_LENGTH);
		dataview.setUint32(5, msg.id);
		dataview.setUint32(9, msg.id2);
		dataview.setUint32(13, msg.token);
		console.log("sending msg");
		this.websocket.send(buffer);
	};

	wsClose(e) {
		console.log("websocket close: (" + e.code + ") " + e.reason);
		console.log("websocket.readyState: " + this.websocket.readyState);
		console.log("reinitializing websocket");
		this.connect();
	};

	wsError(e) {
		console.log("websocket error" + e.message);
		console.log("websocket.readyState: " + this.websocket.readyState);
	};

	wsMessage(msg) {
		console.log("websocket message received (type=" + msg.type +")");
		if (typeof(msg) === 'object' && msg.data instanceof ArrayBuffer) {
			const dataview = new DataView(msg.data);
			const cmsg = new lc.Message(msg.data);
			cmsg.opcode = dataview.getUint8(0);
			cmsg.len = dataview.getUint32(1);
			cmsg.id = dataview.getUint32(5);
			cmsg.id2 = dataview.getUint32(9);
			cmsg.token = dataview.getUint32(13);
			console.log("opcode: " + cmsg.opcode);
			console.log("len: " + cmsg.len);
			console.log("id: " + cmsg.id);
			console.log("id2: " + cmsg.id2);
			console.log("token: " + cmsg.token);
			if (this.callstack[cmsg.token] !== undefined) {
				this.callstack[cmsg.token].updated = Date.now()
				cmsg.sent = this.callstack[cmsg.token].created;
				cmsg.recv = this.callstack[cmsg.token].updated;
				cmsg.delay = cmsg.recv - cmsg.sent;
				console.log("message reponse took " + cmsg.delay + " ms");
				if (this.callstack[cmsg.token].timeout !== undefined) {
					console.log("clearing callback timer " + cmsg.token);
					clearTimeout(this.callstack[cmsg.token].timeout);
				}
				this.callstack[cmsg.token].resolve(cmsg);
				delete this.callstack[cmsg.token];
			}
		}
	}

	wsOpen(e) {
		console.log("websocket open");
		console.log("websocket.readyState: " + this.websocket.readyState);
		this.resolveconnect();
	};

};
lc.Socket = class {
	constructor(lctx) {
		console.log("Socket constructor");
		if (lctx === undefined) throw new Error("Librecast.Context required");
		this.lctx = lctx;
		this.id = undefined;
		this.oncreate = new Promise((resolve, reject) => {
			const msg = new lc.Message();
			msg.opcode = lc.OP_SOCKET_NEW;
			msg.token = this.lctx.callback(resolve, reject);
			this.lctx.send(msg);
		}).
		then((msg) => {
			this.id = msg.id;
		});
	};

	op(opcode, data, timeout) {
		return new Promise((resolve, reject) => {
			if (this.lctx.websocket.readyState == lc.WS_OPEN) {
				const msg = new lc.Message(data);
				msg.opcode = opcode;
				msg.id = this.id;
				msg.token = this.lctx.callback(resolve, reject, timeout);
				this.lctx.send(msg);
			}
			else {
				reject(LibrecastException(lc.ERR_WEBSOCKET_NOTREADY));
			}
		});
	}

	listen() {
		console.log("listening on socket " + this.id);
		return this.op(lc.OP_SOCKET_LISTEN, undefined, lc.NO_TIMEOUT);
	}
};
lc.Channel = class {
	constructor(lctx, channelName) {
		console.log("Channel constructor");
		if (lctx === undefined) throw new Error("Librecast.Context required");
		this.lctx = lctx;
		this.id = undefined;
		this.id2 = undefined;
		this.name = channelName;
		this.oncreate = new Promise((resolve, reject) => {
			const msg = new lc.Message(channelName);
			msg.opcode = lc.OP_CHANNEL_NEW;
			if (msg.len == 0) { reject("channel name required"); };
			msg.token = this.lctx.callback(resolve, reject);
			this.lctx.send(msg);
		})
		.then((msg) => {
			this.id = msg.id;
		});
	};

	op(opcode, data, timeout) {
		return new Promise((resolve, reject) => {
			if (this.lctx.websocket.readyState == lc.WS_OPEN) {
				const msg = new lc.Message(data);
				msg.opcode = opcode;
				msg.id = this.id;
				msg.id2 = this.id2;
				msg.token = this.lctx.callback(resolve, reject, timeout);
				console.log("opcode = " + opcode + ", token = " + msg.token);
				this.lctx.send(msg);
			}
			else {
				reject(LibrecastException(lc.ERR_WEBSOCKET_NOTREADY));
			}
		});
	}

	bind(sock) {
		console.log("binding channel " + this.name + "(" + this.id + ") to socket " + sock.id);
		this.id2 = sock.id;
		return this.op(lc.OP_CHANNEL_BIND);
	}

	join() {
		console.log('joining channel "' + this.name + '"');
		return this.op(lc.OP_CHANNEL_JOIN);
	}

	part() {
		console.log('parting channel "' + this.name + '"');
		return this.op(lc.OP_CHANNEL_PART);
	}

	send(data) {
		return this.op(lc.OP_CHANNEL_SEND, data, lc.NO_TIMEOUT);
	}

};

return lc;

}());
