requirejs.config({
  baseUrl: 'js',
  shim: {
    'promise':{
      exports: 'Promise'
    }
  }
});

require(["jquery", "client"], function($, C) {
  function onMessage(data) {
    console.log(data);
  }


  console.log("Starting");
  C.connect().then(function(){
    C.setHandler(onMessage);
    console.log("nick");
    return C.setNick("sjs");
  }).then(function(){
    console.log("join");
    return C.join("#test");
  }).then(function(){
    console.log("msg");
    return C.msg("#test", "Hello");
  }, function(error) {
    console.log("Error:", error);
  });
});
