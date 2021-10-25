QUnit.module('LibrecastContext', function() {
	QUnit.test("LibrecastContext", function(assert) {
		const done = assert.async(2);
		const lctx = new LIBRECAST.Context();
		lctx.onconnect.then( () => {
			assert.ok(lctx, "new LIBRECAST.Context");
			assert.ok(lctx.websocket instanceof WebSocket, "websocket created");
			done();
		})
		.then( () => {
			const msg = new LIBRECAST.Message('hi there');
			msg.opcode = LIBRECAST.OP_SOCKET_NEW;
			lctx.send(msg);
			done();
		});
	});
});
