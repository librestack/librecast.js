lc.Message = class {
	constructor(data) {
		this.opcode = lc.OP_NOOP;
		this.data = data;
		this.len = (this.data === undefined) ? 0 : data.length;
		this.id = 0;
		this.id2 = 0;
		this.token = 0;
	};

	get utf8() {
		if (this.data !== undefined) {
			const sv = new StringView(this.data, "UTF-8", lc.HEADER_LENGTH, this.len);
			return sv.toString();
		}
	}
};
