//
// Librecast.Context -----------------------------------------------------------
//

lc.Context = class {

	constructor() {
		console.log("Librecast context constructor");
		this.token = 0;
		this.url = (location.protocol == 'https:') ? "wss://" :  "ws://";
		this.url += document.location.host + "/";
		this.callstack = [];
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

	token = () => {
		if (++this.token >= UINT32_MAX) this.token = 0;
		return this.token;
	};

	callback = (resolve, reject) => {
		const token = this.token;
		const cb = {};
		cb.resolve = resolve;
		cb.reject = reject;
		this.callstack[token] = cb;
		// FIXME - need to expire old tokens, or will create leak
	};

	send = (msg) => {
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
		if (typeof(msg) === 'object' && msg.data instanceof ArrayBuffer) {
			const dataview = new DataView(msg.data);
			const opcode = dataview.getUint8(0);
			const len = dataview.getUint32(1);
			const id = dataview.getUint32(5);
			const id2 = dataview.getUint32(9);
			const token = dataview.getUint32(13);
			console.log("opcode: " + opcode);
			console.log("len: " + len);
			console.log("id: " + id);
			console.log("id2: " + id2);
			console.log("token: " + token);
			if (this.callstack[token] !== undefined) {
				this.callstack[token].resolve();
			}
		}
	}

	wsOpen = (e) => {
		console.log("websocket open");
		console.log("websocket.readyState: " + this.websocket.readyState);
		this.resolveconnect();
	};

};
