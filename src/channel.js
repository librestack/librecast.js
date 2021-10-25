lc.Channel = class {
	constructor(lctx, channelName) {
		console.log("Channel constructor");
		if (lctx === undefined) throw new Error("Librecast.Context required");
		this.lctx = lctx;
		this.id = undefined;
		return new Promise((resolve, reject) => {
			const msg = new lc.Message(channelName);
			msg.opcode = lc.OP_CHANNEL_NEW;
			if (msg.len == 0) { reject("channel name required"); };
			msg.token = this.lctx.callback(resolve, reject);
			this.lctx.send(msg);
		});
	};
};
