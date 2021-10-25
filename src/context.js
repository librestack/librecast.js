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

	send = (msg) => {
		let buffer, dataview, idx;

		/* TODO - callback belongs in calling class, if required
		const cb = {};
		cb.resolve = resolve;
		cb.reject = reject;
		this.callstack[token] = cb;
		*/

		buffer = new ArrayBuffer(lc.HEADER_LENGTH + msg.len * 4);
		dataview = new DataView(buffer);
		idx = convertUTF16toUTF8(lc.HEADER_LENGTH, msg.data, msg.len, dataview);
		dataview.setUint8(0, msg.opcode);
		dataview.setUint32(1, idx - lc.HEADER_LENGTH);
		dataview.setUint32(5, msg.id);
		dataview.setUint32(9, msg.id2);
		dataview.setUint32(13, msg.token);
		console.log("sending msg");
		this.websocket.send(buffer);
	};

	wsMessage = (msg) => {
		console.log("wsMessage received");
		console.log(msg);
		// TODO - decode message into LIBRECAST.Message()
		// check for token & promise(callback) & trigger
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
		console.log(msg);
		if (typeof(msg) === 'object') {
			if (msg.data instanceof ArrayBuffer) {
				var dataview = new DataView(msg.data);
				var opcode = dataview.getUint8(0);
				var len = dataview.getUint32(1);
				var id = dataview.getUint32(5);
				var id2 = dataview.getUint32(9);
				var token = dataview.getUint32(13);
			}
		}
	}

	wsOpen = (e) => {
		console.log("websocket open");
		console.log("websocket.readyState: " + this.websocket.readyState);
		this.resolveconnect();
	};

};
