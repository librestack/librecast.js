QUnit.module('Librecast Channel + Socket Operations', function() {
	QUnit.test("Librecast Socket", function(assert) {
		const done = assert.async(4);
		const lctx = new LIBRECAST.Context();
		const channelName = "test";
		lctx.onconnect.then( () => {
			assert.ok(lctx, "Context created");
			assert.ok(lctx.websocket instanceof WebSocket, "websocket created");
			done();
		})
		.then( () => {
			const sock = new LIBRECAST.Socket(lctx);
			const chan = new LIBRECAST.Channel(lctx, channelName);

			sock.then( () => {
				assert.ok(sock, "Socket created");
				done();
			});

			chan.then(() => {
				assert.ok(chan, "Channel created");
				done();
			});

			Promise.all([sock, chan])
			.then(() => {
				assert.ok(true, "Socket and Channel both created");
				done();
			});
		});
	});
});
