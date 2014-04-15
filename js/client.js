define(["sockjs", "promise"], function (SockJS, Promise) {
  var sock;
  var rpc_id = 1;
  var resolver = {};
  var handlers = {}; // str: func(req Obj)->resp Obj
  var msgHandler = function(data){};

  function connect() {
    return new Promise(function(resolve, reject) {
      sock = new SockJS('http://'+document.domain+':'+location.port+'/sjs');
      sock.onopen = function() {
        //sock.send(JSON.stringify({}));
        resolve();
      };
      sock.onmessage = function(msg) {
          console.log(msg);
          var data = JSON.parse(msg.data);
          if(data.rpc_id) { // Rpc reply
            cb = resolver[data.rpc_id];
            delete resolver[data.rpc_id];
            cb(data);
            return;
          }
          // Notice's
          handlers[data.action](data);
      };
      sock.onclose = function() {
          console.log('disconnected');
          setTimeout(function(){try{
            connect().then(function(){
              resolve();
            });
          }catch(e){}},1000);
      };
    });
  }

  function makeRpc(msg) {
    return new Promise(function(resolve, reject) {
      var id = rpc_id++;
      msg.rpc_id = id;
      var timer = setTimeout(function() {
        reject(Error("Rpc timed out"));
      }, 1000);
      resolver[id] = function(data) {
        clearTimeout(timer);
        resolve(data);
      };
      sock.send(JSON.stringify(msg));
    });
  }

  handlers.handshake = function(data) {
    console.log("Hand shake:", data);
    //var pingLoop = function(data){
    //  console.log("ping", data);
    //  client_ping(pingLoop);
    //};
    //pingLoop(0);
  };

  handlers.data = function(data) {
    console.log("--data--");
    console.log(data);
  }

  return {
    // client functions
    connect:connect,
    setNick:function(nick){ return makeRpc({'action':'nick', 'value':nick});},
    join:function(chan){ return makeRpc({'action':'join', 'value':chan});},
    msg:function(chan, msg){ return makeRpc({'action':'msg', 'chan':chan, 'value':msg});},
    setHandler:function(handler) { msgHandler = handler; },
  };
});
