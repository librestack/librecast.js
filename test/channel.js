QUnit.module('Librecast Channel', function() {
	QUnit.test("Librecast Channel", function(assert) {
		const done = assert.async(2);
		const lctx = new LIBRECAST.Context();
		lctx.onconnect.then( () => {
			assert.ok(lctx, "new LIBRECAST.Context");
			assert.ok(lctx.websocket instanceof WebSocket, "websocket created");
			done();
		})
		.then( () => {
			const sock = new LIBRECAST.Channel(lctx);
			sock.then( () => {
				assert.ok(sock, "new LIBRECAST.Channel");
				done();
			});
		});
	});
});
