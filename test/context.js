QUnit.module('Librecast Context', function() {
	QUnit.test("Librecast Context", function(assert) {
		assert.timeout(5000);
		const done = assert.async(2);
		const lctx = new LIBRECAST.Context();
		lctx.onconnect.then( () => {
			assert.ok(lctx, "new LIBRECAST.Context");
			assert.ok(lctx.websocket instanceof WebSocket, "websocket created");
			done();
		})
		.then( () => {
			const msg = new LIBRECAST.Message('hi there');
			lctx.send(msg);
			done();
		});
	});
});
