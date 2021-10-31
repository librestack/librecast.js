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

	op(opcode, data, timeout, callback) {
		return new Promise((resolve, reject) => {
			if (this.lctx.websocket.readyState == lc.WS_OPEN) {
				const msg = new lc.Message(data);
				msg.opcode = opcode;
				msg.id = this.id;
				if (callback !== false) {
					msg.token = this.lctx.callback(resolve, reject, timeout);
				}
				this.lctx.send(msg);
			}
			else {
				reject(LibrecastException(lc.ERR_WEBSOCKET_NOTREADY));
			}
		});
	}

	close() {
		this.lctx.cancelCallback(this.token);
		return this.op(lc.OP_SOCKET_CLOSE, undefined, undefined, false);
	}

	listen(onmessage, onerror) {
		console.log("listening on socket " + this.id);
		if (this.lctx.websocket.readyState == lc.WS_OPEN) {
			const msg = new lc.Message();
			msg.opcode = lc.OP_SOCKET_LISTEN;
			msg.id = this.id;
			msg.token = this.lctx.callback(onmessage, onerror, lc.NO_TIMEOUT, true);
			this.token = msg.token;
			this.lctx.send(msg);
		}
		else {
			reject(LibrecastException(lc.ERR_WEBSOCKET_NOTREADY));
		}
	}
};
