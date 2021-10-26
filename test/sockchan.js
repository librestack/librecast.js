QUnit.module('Librecast Channel + Socket Operations', function() {
	QUnit.test("Librecast Socket", function(assert) {
		assert.timeout(5000);
		const done = assert.async(6);
		const lctx = new LIBRECAST.Context();
		const channelName = "test";
		const messageText = "hello world";
		lctx.onconnect.then( () => {
			assert.ok(lctx, "Context created");
			assert.ok(lctx.websocket instanceof WebSocket, "websocket created");
			done();
		})
		.then( () => {
			const sock = new LIBRECAST.Socket(lctx);
			const chan = new LIBRECAST.Channel(lctx, channelName);

			sock.oncreate.then( () => {
				assert.ok(sock, "Socket created");
				sock.listen().then(msg => {
					assert.ok(true, "message received on Socket");
					assert.strictEqual(msg.utf8, messageText, "message verified");
					done();
				});
				done();
			});

			chan.oncreate.then(() => {
				assert.ok(chan, "Channel created");
				done();
			});

			Promise.all([sock.oncreate, chan.oncreate])
			.then(() => {
				assert.ok(true, "Socket and Channel both created");
				chan.bind(sock).then(() => {
					assert.ok(true, "Channel bound to Socket");
					done();
				});
			})
			.then(() => {
				chan.join().then(() => {
					assert.ok(true, "Channel joined");
					chan.send(messageText);
					done();
				});
			});

		});
	});
});
