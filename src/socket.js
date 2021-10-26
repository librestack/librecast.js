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

	op(opcode, data) {
		return new Promise((resolve, reject) => {
			if (this.lctx.websocket.readyState == lc.WS_OPEN) {
				const msg = new lc.Message(data);
				msg.opcode = opcode;
				msg.id = this.id;
				msg.token = this.lctx.callback(resolve, reject);
				this.lctx.send(msg);
			}
			else {
				reject(LibrecastException(lc.ERR_WEBSOCKET_NOTREADY));
			}
		});
	}

	listen() {
		console.log("listening on socket " + this.id);
		return this.op(lc.OP_SOCKET_LISTEN);
	}
};
