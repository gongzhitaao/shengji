(function($, undefined){

  "use strict";

  var socket = io.connect("http://localhost:8080/");

  $(document).ready(function() {

    var widget_ = require("./widgets/widget.js")(socket);

    // Login form forbids empty name and sends valid names to server
    // for duplicate checking.

    $(".overlay button").click(function(e) {
      var $input = $(".overlay input");
      var name = $.trim($input.val());
      if (!name.length) {
        var $pop = $input.popover({
          content: "无名少姓之辈！",
          placement: "top"}).popover("show");
        setTimeout(function() {
          $pop.popover("destroy");
        }, 2500);
      } else {
        socket.emit("login", name);
      }
    });

    /* ---------------------------------------------------------------
     * Client logic
     *
     * Basically listen to the contol of the server.
     * ---------------------------------------------------------------
     */

    // When client initially connects to the server, the server says
    // hello with other players' information.

    socket.on("hello", function(d) {
      widget_.avatar.flip(d);
      widget_.echo.info("server says hello");
    });

    socket.on("re:login", function(d) {
      if (d) {
        widget_.avatar.me(d);
        $(".overlay").remove();
      } else {
        var $input = $(".overlay input");
        var $pop = $input.popover({
          content: "此名号已报，请大侠行更名，坐改姓！",
          placement: "top"}).popover("show");
        setTimeout(function() {
          $pop.popover("destroy");
        }, 2500);
      }
    });

    socket.on("new player", function(d) {
      widget_.avatar.flip([d]);
      widget_.echo.info("User " + d.name + " logged in.");
    });

    socket.on("user left", function(d) {
      widget_.avatar.flip([d]);
    });

    socket.on("dealer", function(d) {
      store.session("dealer", d.id);
      store.session("domrank", d.domrank);
      widget_.avatar.change_dealer(d.id);
      widget_.declarer.change_dealer();
    });

    socket.on("draw", function(d) {
      store.session("drawing", true);
      store.session("domsuit", {suit: "", n: 0});
      widget_.avatar.hideme();
      widget_.declarer.enabled(true);
      widget_.mycard.draw(d);
    });

    socket.on("declared", function(d) {
      store.session("declarer", d.id);
      store.session("domsuit", {suit: d.suit, n: d.n});
      widget_.mycard.sort(d.suit);
      widget_.declarer.declared();
    });

    socket.on("kitty", function(d) {
      var me = store.session("me");
      var dealer = store.session("dealer");
      if (me.id == dealer)
        widget_.declarer.enabled(false);
      widget_.mycard.kitty(d);
    });

    socket.on("kittying", function() {
      widget_.declarer.enabled(false);
    });

    socket.on("kittied", function() {
      store.session("kittied", true);
      widget_.declarer.update();
    });

    socket.on("prepare to play", function() {
      widget_.mycard.prepare();
    });

    socket.on("play", function() {
      widget_.mycard.play();
    });

    socket.on("disconnect", function() {
      store.session("drawing", false);
      store.session("declarer", -1);
      store.session("domsuit", {suit: "", n: 0});
    });
  });

})(jQuery);
