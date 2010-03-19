require("../common");

net = require("net");

process.Buffer.prototype.toString = function () {
  return this.utf8Slice(0, this.length);
};

var tests_run = 0;

function pingPongTest (port, host) {
  var N = 1000;
  var count = 0;
  var sent_final_ping = false;

  var server = net.createServer(function (socket) {
    puts("connection: " + socket.remoteAddress);
    assert.equal(server, socket.server);

    socket.setNoDelay();
    socket.timeout = 0;

    socket.setEncoding('utf8');
    socket.addListener("data", function (data) {
      puts("server got: " + data);
      assert.equal(true, socket.writable);
      assert.equal(true, socket.readable);
      assert.equal(true, count <= N);
      if (/PING/.exec(data)) {
        socket.write("PONG");
      }
    });

    socket.addListener("end", function () {
      assert.equal(true, socket.writable);
      assert.equal(false, socket.readable);
      socket.close();
    });

    socket.addListener("error", function (e) {
      throw e;
    });

    socket.addListener("close", function () {
      puts('server socket closed');
      assert.equal(false, socket.writable);
      assert.equal(false, socket.readable);
      socket.server.close();
    });
  });

  server.addListener("listening", function () {
    puts("server listening on " + port + " " + host);

    var client = net.createConnection(port, host);

    client.setEncoding('ascii');
    client.addListener("connect", function () {
      assert.equal(true, client.readable);
      assert.equal(true, client.writable);
      client.write("PING");
    });

    client.addListener("data", function (data) {
      puts("client got: " + data);

      assert.equal("PONG", data);
      count += 1;

      if (sent_final_ping) {
        assert.equal(false, client.writable);
        assert.equal(true, client.readable);
        return;
      } else {
        assert.equal(true, client.writable);
        assert.equal(true, client.readable);
      }

      if (count < N) {
        client.write("PING");
      } else {
        sent_final_ping = true;
        client.write("PING");
        client.close();
      }
    });

    client.addListener("close", function () {
      puts('client closed');
      assert.equal(N+1, count);
      assert.equal(true, sent_final_ping);
      tests_run += 1;
    });

    client.addListener("error", function (e) {
      throw e;
    });
  });

  server.listen(port, host);
}

/* All are run at once, so run on different ports */
pingPongTest(20989, "localhost");
pingPongTest(20988);
pingPongTest(20997, "::1");
pingPongTest("/tmp/pingpong.sock");

process.addListener("exit", function () {
  assert.equal(4, tests_run);
  puts('done');
});
