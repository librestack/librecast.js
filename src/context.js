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
		if (timeout === undefined) { timeout = lc.DEFAULT_TIMEOUT; };
		cb.timeout = setTimeout( () => {
			reject("callback timeout");
			delete this.callstack[token];
		}, timeout);
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
