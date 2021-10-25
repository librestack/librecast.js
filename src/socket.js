lc.Socket = class {
	constructor(lctx) {
		console.log("Socket constructor");
		if (lctx === undefined) throw new Error("Librecast.Context required");
		this.lctx = lctx;
		this.id = undefined;
		return new Promise((resolve, reject) => {
			const msg = new lc.Message();
			msg.opcode = lc.OP_SOCKET_NEW;
			this.lctx.callback(resolve, reject);
			this.lctx.send(msg);
		});
	};
};
