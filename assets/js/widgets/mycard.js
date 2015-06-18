module.exports = function(svg, socket) {
  var V = require("./var.js");
  var declarer_ = require("./declarer.js")(svg, socket);
  var validator_ = require("./validator.js");
  var d3card_ = svg.append("g").attr("class", "mycard");
  var domrank_ = "2";

  var pool_ = [];
  var chosen_;

  var offset_ = 0;

  var val = {
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
    "8": 8, "9": 9, "10": 10, "j": 11, "q": 12, "k": 13, "a": 14,
    "r": -3, "b": -2, "dr": -1, "c": 0, "d": 1, "s": 2, "h": 3
  };

  function cmp(a, b) {
    var sa = (val[a.val.slice(-1)] + offset_) % 4,
        sb = (val[b.val.slice(-1)] + offset_) % 4,
        ra = a.val.slice(0, -1),
        rb = b.val.slice(0, -1),
        va = val[ra],
        vb = val[rb];
    if (domrank_ == ra) va = sa, sa = val.dr;
    if (domrank_ == rb) vb = sb, sb = val.dr;
    return sa - sb ? sa - sb : va - vb;
  }

  function drawing(from, to, fn) {
    setTimeout(function(from, to, fn) {

      if (declarer_.enabled())
        declarer_.newcard(from[0]);

      to.push({val: from[0], id: to.length});
      to.sort(cmp);

      var mid = Math.floor(to.length / 2);
      var card = d3card_.selectAll("g")
            .data(to, function(d) { return d.id; });

      d3.transition().duration(200)
        .each(function() {
          var newcard = card.enter().append("g");

          newcard.on("click", function(d, i) {
            var self = d3.select(this);
            if (self.classed("chosen")) {
              self
                .classed("chosen", false)
                .attr("transform", "");
            } else {
              self
                .classed("chosen", true)
                .attr("transform", "translate(0, -20)");
            }
          });

          newcard.attr("opacity", "1e-6");

          newcard
            .append("rect")
            .attr("class", "card-bg")
            .attr("x", 750 + V.bgXOff).attr("y", 315 + V.bgYOff)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("width", V.bgW)
            .attr("height", V.bgH);
          newcard
            .append("text")
            .attr("dy", V.TxtDy)
            .attr("class", function(d, i) { return "poker " + V.Poker[d.val].suit; })
            .text(function(d) { return V.Poker[d.val].text; })
            .attr("x", 750).attr("y", 315);

          card.sort(cmp);

          newcard.transition().attr("opacity", 1);
          newcard.select(".card-bg")
            .transition()
            .attr("x", function(d, i) { return (i - mid) * V.CardXOff + 800 + V.bgXOff; })
            .attr("y", 765 + V.bgYOff);
          newcard.select(".poker")
            .transition()
            .attr("x", function(d, i) { return (i - mid) * V.CardXOff + 800; })
            .attr("y", 765)
            .attr("opacity", "1");
          ;})
        .transition().each(function() {
          card.select(".card-bg")
            .transition()
            .attr("x", function(d, i) { return (i - mid) * V.CardXOff + 800 + V.bgXOff; });
          card.select(".poker")
            .transition()
            .attr("x", function(d, i) { return (i - mid) * V.CardXOff + 800; });
          ;});

      var tmp = from.slice(1);
      if (tmp.length) drawing(tmp, to, fn);
      else if (fn) fn();
    }, 600, from, to, fn);
  }

  function discard(cards) {
    var played = d3card_.selectAll("g")
          .data(cards, function(d) { return d.id; });

    cards.forEach(function(d) {
      pool_.splice(_.sortedIndex(pool_, d, cmp), 1); });

    d3.transition().duration(200)
      .each(function() {
        var mid = cards.length / 2;
        played.select(".card-bg")
          .transition()
          .attr("x", function(d, i) { return (i - mid) * V.CardXOff + 800 + V.bgXOff; })
          .attr("y", 465 + V.bgYOff);
        played.select(".poker")
          .transition()
          .attr("x", function(d, i) { return (i - mid) * V.CardXOff + 800; })
          .attr("y", 465);
        played.remove();
        ;})
      .transition().each(function() {
        var cards = d3card_.selectAll("g").data(pool_);
        var mid = pool_.length / 2;
        cards.sort(cmp);
        cards.select(".card-bg")
          .transition()
          .attr("x", function(d, i) { return (i - mid) * V.CardXOff + 800 + V.bgXOff; });
        cards.select(".poker")
          .transition()
          .attr("x", function(d, i) { return (i - mid) * V.CardXOff + 800; });
        ;});
  }

  var self = {};

  self.declarer = declarer_;

  self.draw = function(arr) {
    domrank_ = "" + store.session("domrank");
    pool_ = [];
    drawing(arr, pool_, function() {
      store.session("drawing", false);
      declarer_.update();
      pool_.sort(cmp);
      store.session("mycards", pool_);
    });
  };

  self.kitty = function(arr) {
    drawing(arr, pool_, function() {
      var btn = svg.append("g")
            .attr("class", "btn kitty")
            .attr("transform", "translate(800,675)")
            .on("click", function() {
              var chosen = d3card_.selectAll(".chosen");
              if (6 == chosen.size()) {
                btn.remove();

                var cards = [], kitty = [];
                chosen.each(function(d) {
                  cards.push(d);
                  kitty.push(d.val);
                });

                discard(cards);
                socket.emit("re:kitty", kitty);
              }
              ;})
            .append("text")
            .attr("dy", V.TxtDy)
            .text("扣牌");
    });
  };

  self.sort = function(suit) {
    if ("redjoker" == suit || "blackjoker" == suit)
      return;

    // cdsh
    offset_ = (4 - val[suit[0]]) % 4;

    if (!store.session("drawing")) {
      pool_.sort(cmp);
      var mid = pool_.length / 2;
      var cards = d3card_.selectAll("g").data(pool_);
      cards.sort(cmp);
      cards.select(".card-bg")
        .transition()
        .attr("x", function(d, i) { return (i - mid) * V.CardXOff + 800 + V.bgXOff; });
      cards.select(".poker")
        .transition()
        .attr("x", function(d, i) { return (i - mid) * V.CardXOff + 800; });
    }
  };

  self.prepare = function() {
    validator_.init();
  };

  self.play = function() {

  };

  return self;
};
