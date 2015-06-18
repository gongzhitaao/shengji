var PORT = process.env.OPENSHIFT_INTERNAL_PORT
      || process.env.OPENSHIFT_NODEJS_PORT
      || 8080;
var ADDR = process.env.OPENSHIFT_INTERNAL_IP
      || process.env.OPENSHIFT_NODEJS_IP
      || "127.0.0.1";

/* -------------------------------------------------------------------
 * Setup the server
 * -------------------------------------------------------------------
 */

var express, io;
var server, app;
var sj_server;

express = require("express");

app = express();

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});
app.use(express.static("assets"));

server = require("http").createServer(app);
server.listen(PORT, ADDR);

/* -------------------------------------------------------------------
 * Server logic
 * -------------------------------------------------------------------
 */

io = require("socket.io").listen(server);
sj_server = require("./shengji_server.js");

io.on("connection", function(socket) {
  sj_server.serve(socket);
});
