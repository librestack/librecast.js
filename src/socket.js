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

	listen() {
		console.log("listening on socket " + this.id);
		return new Promise((resolve, reject) => {
			const msg = new lc.Message();
			msg.opcode = lc.OP_SOCKET_LISTEN;
			msg.id = this.id;
			msg.token = this.lctx.callback(resolve, reject);
			this.lctx.send(msg);
		});
	}
};
