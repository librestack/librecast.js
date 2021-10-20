QUnit.module('LibrecastContext', function() {
	QUnit.test("LibrecastContext", function(assert) {
		const done = assert.async();
		const lctx = new LIBRECAST.Context(done);
		assert.ok(lctx, "new LIBRECAST.Context");
		assert.ok(lctx.websocket instanceof WebSocket, "websocket created");
	});
});
