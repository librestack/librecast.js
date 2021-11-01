//
// Librecast.Context -----------------------------------------------------------
//

lc.Context = class {

	constructor() {
		console.log("Librecast context constructor");
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
		return Math.floor(Math.random() * UINT32_MAX);
	};

	callback(resolve, reject, timeout, repeat) {
		const token = this.token;
		const cb = {};
		cb.resolve = resolve;
		cb.reject = reject;
		cb.created = Date.now();
		cb.repeat = repeat;
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

	cancelCallback(token) {
		console.log("cancelling callback token " + token);
		if (this.callstack[token] !== undefined) {
			if (this.callstack[token].timeout !== undefined) {
				clearTimeout(this.callstack[token].timeout);
			}
		}
		delete this.callstack[token];
	}

	send(msg) {
		let buffer, dataview, idx;
		buffer = new ArrayBuffer(lc.HEADER_LENGTH + msg.len * 4);
		dataview = new DataView(buffer);
		if (msg.data !== undefined && msg.len > 0) {
			if (typeof msg.data === 'object') {
				// copy ArrayBuffer into new buffer with space for header data
				idx = lc.HEADER_LENGTH + msg.len;
				const tmp = new Uint8Array(idx);
				tmp.set(new Uint8Array(msg.data), lc.HEADER_LENGTH);
				buffer = tmp.buffer;
				dataview = new DataView(buffer);
			}
			else {
				// string data, convert to UTF-8
				idx = util.convertUTF16toUTF8(lc.HEADER_LENGTH, msg.data, msg.len, dataview);
			}
		}

		// write headers
		dataview.setUint8(0, msg.opcode);
		dataview.setUint32(1, idx - lc.HEADER_LENGTH);
		dataview.setUint32(5, msg.id);
		dataview.setUint32(9, msg.id2);
		dataview.setUint32(13, msg.token);

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
			cmsg.payload = msg.data.slice(lc.HEADER_LENGTH);
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
					this.callstack[cmsg.token].timeout = undefined;
				}
				if (this.callstack[cmsg.token].resolve !== undefined) {
					this.callstack[cmsg.token].resolve(cmsg);
					if (this.callstack[cmsg.token] !== undefined) {
						if (!this.callstack[cmsg.token].repeat) {
							this.cancelCallback(cmsg.token);
						}
					}
				}
			}
		}
	}

	wsOpen(e) {
		console.log("websocket open");
		console.log("websocket.readyState: " + this.websocket.readyState);
		this.resolveconnect();
	};

};
