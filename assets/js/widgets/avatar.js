module.exports = function(svg, socket) {

  var V = require("./var.js");
  var Pos_ = [{x: 750, y: 15},
              {x: 0, y: 315},
              {x: 750, y: 765},
              {x: 1490, y: 315}];
  var Img_ = [
    // Shown when empty
    [V.Poker["redback"], V.Poker["blackback"],
     V.Poker["redback"], V.Poker["blackback"]],

    // shown when player logged in
    [V.Poker["ch"], V.Poker["cs"],
     V.Poker["cd"], V.Poker["cc"]]];

  var Name_ = ["猜猜我是谁", "老冀在震家", "不知道", "刘博已死"];

  var taken_ = [0, 0, 0, 0];

  var me_ = {id: -1, name: ""};

  var g = svg.selectAll(".avatar")
        .data([{id: 0, name: ""}, {id: 1, name: ""},
               {id: 2, name: ""}, {id: 3, name: ""}],
              function(d) { return d.id; })
        .enter().append("g")
        .attr("class", function(d) { return "avatar " + "avt-" + d.id; });

  g.append("rect")
    .attr("class", "card-bg")
    .attr("x", function(d) { return Pos_[d.id].x + V.bgXOff; })
    .attr("y", function(d) { return Pos_[d.id].y + V.bgYOff; })
    .attr("rx", 10)
    .attr("ry", 10)
    .attr("width", V.bgW)
    .attr("height", V.bgH);
  g.append("text")
    .attr("class", function(d) { return "poker " + Img_[taken_[d.id]][d.id].suit; })
    .attr("dy", V.TxtDy)
    .attr("x", function(d) { return Pos_[d.id].x; })
    .attr("y", function(d) { return Pos_[d.id].y; })
    .text(function (d) { return Img_[taken_[d.id]][d.id].text; });

  g.append("rect")
    .attr("class", "name-bg")
    .attr("x", function(d) { return Pos_[d.id].x; })
    .attr("y", function(d) { return Pos_[d.id].y + 35; })
    .attr("width", V.bgW)
    .attr("height", 40);
  g.append("text")
    .attr("class", "name")
    .attr("dy", V.TxtDy)
    .attr("x", function(d) { return Pos_[d.id].x + 10; })
    .attr("y", function(d) { return Pos_[d.id].y + 50; })
    .text(function(d) { return Name_[d.id]; });

  var gg = g.append("g").attr("class", "dealer dealer-off");
  gg.append("circle")
    .attr("class", "dealer-bg")
    .attr("cx", function(d) { return Pos_[d.id].x + 85;})
    .attr("cy", function(d) { return Pos_[d.id].y + 16; })
    .attr("fill", "yellow")
    .attr("r", 25);
  gg.append("text")
    .attr("class", "dealer-fg")
    .attr("dy", V.TxtDy)
    .attr("x", function(d) { return Pos_[d.id].x + 65; })
    .attr("y", function(d) { return Pos_[d.id].y; })
    .text(V.Icon["dealer"].text);

  var self = {};

  self.change_dealer = function(id) {
    svg.select(".avatar").selectAll(".dealer-on")
      .classed("dealer-on", false);
    svg.select(".avt-" + id + " .dealer")
      .classed("dealer-off", false)
      .classed("dealer-on", true);
  };

  self.me = function(n) {
    me_.name = n;
  };

  self.hideme = function() {
    svg.selectAll(".avatar").data([me_], function(d) { return d.id; })
      .transition().attr("opacity", 0).attr("visibility", "hidden");
  };

  self.showme = function() {
    svg.selectAll(".avatar").data([me_], function(d) { return d.id; })
      .transition().attr("opacity", 1).attr("visibility", "visible");
  };

  self.flip = function(data) {
    var to_update = d3.selectAll(".avatar")
          .data(data, function(d) { return d.id; });

    d3.transition().duration(100)
      .each(function() {
        to_update
          .transition()
          .attr("opacity", "1e-6")
          .each(function(d) { taken_[d.id] = 1 - taken_[d.id];});
        ;})
      .transition().each(function() {
        to_update
          .select(".poker")
          .attr("class", function(d) { return "poker " + Img_[taken_[d.id]][d.id].suit; })
          .text(function(d) { return Img_[taken_[d.id]][d.id].text; });
        to_update.select(".name")
          .text(function(d) { return d.name ? d.name : Name_[d.id]; });
        ;})
      .transition().each(function() {
        to_update
          .transition()
          .attr("opacity", "1");
        ;});

    if (me_.id >= 0) return;

    to_update = svg.selectAll(".avatar");
    to_update.filter(function(d) { return taken_[d.id]; })
      .on("click", null);
    to_update.filter(function(d) { return !taken_[d.id]; })
      .on("click", function (d, i) {
        svg.selectAll(".avatar").on("click", null);
        store.session.clear();
        me_.id = d.id;
        store.session("me", me_);
        socket.emit("join", me_);
        self.flip([me_]);
        rotate();
        svg.append("g")
          .attr("class", "btn")
          .on("click", function() {
            d3.select(this).remove();
            socket.emit("ready"); })
          .append("text")
          .attr("x", 800).attr("y", 675)
          .attr("text-anchor", "middle")
          .attr("dy", V.TxtDy).text("搞起！");
      });
  };

  function rotate() {
    if (2 == me_.id) return;
    var k = (6 - me_.id) % 4;
    d3.selectAll(".avatar")
      .transition(1000)
      .attr("transform", function(d, i) {
        var j = (d.id + k) % 4;
        var dx = Pos_[j].x - Pos_[d.id].x;
        var dy = Pos_[j].y - Pos_[d.id].y;
        return "translate(" + dx + "," + dy + ")";
      });
  }

  return self;
};
