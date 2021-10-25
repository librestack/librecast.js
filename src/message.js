lc.Message = class {
	constructor(data) {
		this.opcode = lc.OP_NOOP;
		this.data = data;
		this.len = (this.data === undefined) ? 0 : data.length;
		this.id = 0;
		this.id2 = 0;
		this.token = 0;
	};
};
