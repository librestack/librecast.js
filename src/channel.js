lc.Channel = class {
	constructor(lctx, channelName) {
		console.log("Channel constructor");
		if (lctx === undefined) throw new Error("Librecast.Context required");
		this.lctx = lctx;
		this.id = undefined;
		this.id2 = undefined;
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

	op(opcode, data) {
		return new Promise((resolve, reject) => {
			if (this.lctx.websocket.readyState == lc.WS_OPEN) {
				const msg = new lc.Message(data);
				msg.opcode = opcode;
				msg.id = this.id;
				msg.id2 = this.id2;
				msg.token = this.lctx.callback(resolve, reject);
				this.lctx.send(msg);
			}
			else {
				reject(LibrecastException(lc.ERR_WEBSOCKET_NOTREADY));
			}
		});
	}

	bind(sock) {
		console.log("binding channel " + this.name + "(" + this.id + ") to socket " + sock.id);
		this.id2 = sock.id;
		return this.op(lc.OP_CHANNEL_BIND);
	}

	join() {
		console.log('joining channel "' + this.name + '"');
		return this.op(lc.OP_CHANNEL_JOIN);
	}

	part() {
		console.log('parting channel "' + this.name + '"');
		return this.op(lc.OP_CHANNEL_PART);
	}

	send(data) {
		return this.op(lc.OP_CHANNEL_SEND, data);
	}

};
