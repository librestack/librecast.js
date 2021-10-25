lc.Channel = class {
	constructor(lctx, channelName) {
		console.log("Channel constructor");
		if (lctx === undefined) throw new Error("Librecast.Context required");
		this.lctx = lctx;
		this.id = undefined;
		this.name = channelName;
		this.oncreate = new Promise((resolve, reject) => {
			const msg = new lc.Message(channelName);
			msg.opcode = lc.OP_CHANNEL_NEW;
			if (msg.len == 0) { reject("channel name required"); };
			msg.token = this.lctx.callback(resolve, reject);
			this.lctx.send(msg);
		})
		.then((msg) => {
			this.id = msg.id;
		});
	};

	bind(sock) {
		console.log("binding channel " + this.name + "(" + this.id + ") to socket " + sock.id);
		return new Promise((resolve, reject) => {
			const msg = new lc.Message();
			msg.opcode = lc.OP_CHANNEL_BIND;
			msg.id = this.id;
			msg.id2 = sock.id;
			msg.token = this.lctx.callback(resolve, reject);
			this.lctx.send(msg);
		});
	}

	join() {
		console.log('joining channel "' + this.name + '"');
		return new Promise((resolve, reject) => {
			const msg = new lc.Message();
			msg.opcode = lc.OP_CHANNEL_JOIN;
			msg.id = this.id;
			msg.token = this.lctx.callback(resolve, reject);
			this.lctx.send(msg);
		});
	}

	send(data) {
		if (this.lctx.websocket.readyState == lc.WS_OPEN) {
			return new Promise((resolve, reject) => {
				const msg = new lc.Message(data);
				msg.opcode = lc.OP_CHANNEL_SEND;
				msg.id = this.id;
				msg.token = this.lctx.callback(resolve, reject);
				this.lctx.send(msg);
			});
		}
		else {
			throw new LibrecastException(lc.ERR_WEBSOCKET_NOTREADY);
		}
	}

};
