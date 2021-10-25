lc.Channel = class {
	constructor(lctx) {
		console.log("Channel constructor");
		if (lctx === undefined) throw new Error("Librecast.Context required");
		this.lctx = lctx;
		this.id = undefined;
		return new Promise((resolve, reject) => {
			const msg = new lc.Message();
			msg.opcode = lc.OP_CHANNEL_NEW;
			this.lctx.callback(resolve, reject);
			this.lctx.send(msg);
		});
	};
};
