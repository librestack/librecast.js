//
// Librecast.Context -----------------------------------------------------------
//

lc.Context = class {

	constructor() {
		console.log("Librecast context constructor");

		this.url = (location.protocol == 'https:') ? "wss://" :  "ws://";
		this.url += document.location.host + "/";

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
