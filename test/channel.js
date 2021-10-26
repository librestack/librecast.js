QUnit.module('Librecast Channel', function() {
	QUnit.test("Librecast Channel", function(assert) {
		assert.timeout(5000);
		const done = assert.async(4);
		const lctx = new LIBRECAST.Context();
		lctx.onconnect.then( () => {
			assert.ok(lctx, "new LIBRECAST.Context");
			assert.ok(lctx.websocket instanceof WebSocket, "websocket created");
			done();
		})
		.then( () => {
			const chan = new LIBRECAST.Channel(lctx, "this space for rent");
			chan.oncreate.then( () => {
				assert.ok(chan, "new LIBRECAST.Channel");
				chan.join().then( () => {
					assert.ok(true, "joined channel");
					chan.part().then( () => {
						assert.ok(true, "parted channel");
						done();
					});
					done();
				});
				done();
			});
		});
	});
});
