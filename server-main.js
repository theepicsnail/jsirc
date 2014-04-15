#!/usr/bin/node
var net = require('net');
var http = require('http');
var fs = require('fs');
var sockjs = require('sockjs');
var node_static = require('node-static');

var static_dir = new node_static.Server(__dirname);

var sockjs_opts = {sockjs_url: "http://cdn.sockjs.org/sockjs-0.2.min.js"};

var sockjs_server = sockjs.createServer(sockjs_opts);

var http_server = http.createServer();

var port = process.argv[2] || 2000;

var host = '0.0.0.0';

var startTime = (new Date()).getTime();

var sockets = {};
var irc_sockets = {};
var handler = {}; // map of action->handler func.
// handler func = function(request obj)->response obj

var next_id = 1;
function nextID() {
  return next_id ++;
}

sockjs_server.on('connection', function(socket) {
    var id = nextID();
    sockets[id] = socket;
    console.log("Connection", id);
    irc_sockets[id] = net.connect({port:7777}, function(){
      irc_sockets[id].write("USER A B C D:E\r\n")
    });
    irc_sockets[id].on('data', function(data) {
      data = data + "";
      console.log(">>"+data);
      if (data.substr(0,4) == "PING"){
        irc_sockets[id].write("PONG" + data.substr(4))
        console.log("<<PONG" + data.substr(4))
      }
      else {
        //console.log("<>" + data);
        sockets[id].write(JSON.stringify({'action':'data', 'value':data}));
      }
    });
    socket.on('data', function(message){
      var messageObject = JSON.parse(message);
      var rpc_id = messageObject.rpc_id;
      resp =  handler[messageObject.action](id, messageObject) || {};
      resp.rpc_id = rpc_id;
      socket.write(JSON.stringify(resp));
    });

    socket.on('end',function(){
        delete sockets[id];
    });

    socket.write(JSON.stringify({
        'action':'handshake',
        'uid': id
    }));
});

handler.nick = function(id, req) {
  irc_sockets[id].write("NICK " + req.value + "\r\n");
  console.log("<<NICK " + req.value + "\r\n");
};

handler.join = function(id, req) {
  irc_sockets[id].write("JOIN " + req.value + "\r\n");
  console.log("<<JOIN " + req.value + "\r\n");
}

handler.msg = function(id, req) {
  irc_sockets[id].write("PRIVMSG " + req.chan + " :" + req.value + "\r\n");
  console.log("<<PRIVMSG " + req.chan + " :" + req.value + "\r\n");

}

//function publish(message){
//    var msg = JSON.stringify(message);
//    for(var id in sockets){
//        sockets[id].write(msg);
//    }
//}

http_server.addListener('request', function(req, res) {
     static_dir.serve(req, res);
});

http_server.addListener('upgrade', function(req, res) {
     res.end();
});

sockjs_server.installHandlers(http_server, {prefix:'/sjs'});

http_server.listen(port, host);
