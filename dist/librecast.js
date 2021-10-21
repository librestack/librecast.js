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
//
// Librecast.Context -----------------------------------------------------------
//

lc.Context = class {

	constructor() {
		console.log("Librecast context constructor");

		this.url = (location.protocol == 'https:') ? "wss://" :  "ws://";
		this.url += document.location.host + "/";

		//this.onmessage = new Promise(resolve => { this.resolvemsg = resolve; });
		this.onconnect = new Promise(resolve => { this.resolveconnect = resolve; });
		this.connect();
	};

	connect = () => {
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

	close = () => {
		console.log("Librecast close()");
		this.websocket.close();
	};

	wsClose = (e) => {
		console.log("websocket close: (" + e.code + ") " + e.reason);
		console.log("websocket.readyState: " + this.websocket.readyState);
		console.log("reinitializing websocket");
		this.connect();
	};

	wsError = (e) => {
		console.log("websocket error" + e.message);
		console.log("websocket.readyState: " + this.websocket.readyState);
	};

	wsMessage = (msg) => {
		console.log("websocket message received (type=" + msg.type +")");
	}

	wsOpen = (e) => {
		console.log("websocket open");
		console.log("websocket.readyState: " + this.websocket.readyState);
		this.resolveconnect();
	};

};

return lc;

}());
