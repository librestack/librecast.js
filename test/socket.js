QUnit.module('Librecast Socket', function() {
	QUnit.test("Librecast Socket", function(assert) {
		assert.timeout(5000);
		const done = assert.async(2);
		const lctx = new LIBRECAST.Context();
		lctx.onconnect.then( () => {
			assert.ok(lctx, "new LIBRECAST.Context");
			assert.ok(lctx.websocket instanceof WebSocket, "websocket created");
			done();
		})
		.then( () => {
			const sock = new LIBRECAST.Socket(lctx);
			sock.oncreate.then( () => {
				assert.ok(sock, "new LIBRECAST.Socket");
				done();
			});
		});
	});
});