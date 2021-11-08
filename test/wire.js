QUnit.module('Wire', function() {
	QUnit.test('wirePack() / wireUnpack()', function(assert) {
		//assert.equal(18446744073709551615n, encode7BitOverflow(), "thing");

		assert.strictEqual(127, 0x7f, "0x7f");
		assert.strictEqual(128, 0x80, "0x80");
		assert.strictEqual(util.bytes7BitLength(0), 1, "bytes (0) == 1");
		assert.strictEqual(util.bytes7BitLength(127), 1, "bytes (127) == 1");
		assert.strictEqual(util.bytes7BitLength(128), 2, "bytes (128) == 2");
		assert.strictEqual(util.bytes7BitLength(16384), 3, "bytes (16384) == 3");
		assert.strictEqual(util.bytes7BitLength(2097152), 4, "bytes (2097152) == 4");
		assert.strictEqual(util.bytes7BitLength(268435456), 5, "bytes (268435456) == 5");
		assert.strictEqual(util.bytes7BitLength(4294967295), 5, "bytes (4294967295) == 5");

		const opcode = 0x1;
		const flags = 0x7;
		let fields = [];
		fields.push("hello", "world",
					"ooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo");
		const buffer = util.wirePack(opcode, flags, fields);
		let view = new DataView(buffer);
		assert.strictEqual(view.getUint8(0), opcode, "opcode set");
		assert.strictEqual(view.getUint8(1), flags, "flags set");

		const ret = util.wireUnpack(buffer);
		assert.strictEqual(ret[0], opcode, "opcode unpacked");
		assert.strictEqual(ret[1], flags, "flags unpacked");

		var f0 = new StringView(ret[2][0], "UTF-8", 0).toString();
		var f1 = new StringView(ret[2][1], "UTF-8", 0).toString();
		var f2 = new StringView(ret[2][2], "UTF-8", 0).toString();
		assert.strictEqual(f0, "hello", "field 0 matches");
		assert.strictEqual(f1, "world", "field 1 matches");
		assert.strictEqual(f2, "ooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo", "field 2 matches");

		view = new DataView(util.encode7BitLength(127));
		let tmp = view.getUint8(0);
		assert.strictEqual(tmp, 0x7f, "bufferlen 0x7f");

		view = new DataView(util.encode7BitLength(128));
		tmp = view.getUint8(0);
		assert.strictEqual(tmp, 0x80, "bufferlen 0x80");

	});
});
