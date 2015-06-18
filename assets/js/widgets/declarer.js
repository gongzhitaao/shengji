module.exports = function(svg, socket) {

  var V = require("./var.js");
  var d3decl_ = svg.append("g")
        .attr("class", "declarer")
        .attr("visibility", "hidden")
        .attr("opacity", 0);
  var domrank_ = "2";
  var color_ = {redjoker: ["heart", "diamond"],
                blackjoker: ["club", "spade"]};
  var declarer_ = -1;
  var dealer_ = -1;
  var domsuit_ = {suit: "", n: 0};
  var me_;
  var cnt_ = {
    "redjoker": 0, "blackjoker": 0,
    "spade": 0, "diamond": 0, "club": 0, "heart": 0};
  var level_ = {
    spade: 0, club: 0, heart: 0, diamond: 0,
    blackjoker: 1, redjoker: 2};
  var enabled_ = true;

  var W_ = 40;
  var H_ = 40;
  var T_ = 25;

  var lighton = d3decl_.append("text")
        .attr("x", 400).attr("y", 650)
        .attr("dy", V.TxtDy)
        .attr("visibility", "hidden")
        .attr("class", "poker btn agree")
        .text(V.Icon.bulb.text)
        .on("click", function() {
          socket.emit("agreed", declarer_);
          self.enabled(false);
        });

  var declopt_ = [];
  {
    var i, j, s;
    var suits = ["club", "heart", "spade", "diamond"];
    for (i = 0; i < suits.length; ++i) {
      s = suits[i];
      for (j = 1; j <= 3; ++j)
        declopt_.push({id: j + s[0], n: j});
    }
    var jokers = ["blackjoker", "redjoker"];
    for (i = 0; i < jokers.length; ++i) {
      s = jokers[i];
      for (j = 2; j <= 3; ++j)
        declopt_.push({id: j + s[0], n: j});
    }
  }

  var g = d3decl_.selectAll("g")
        .data(declopt_, function(d) { return d.id; })
        .enter().append("g");
  g.attr("class", "decl-no");
  g.each(function(d, i) {
    var mid = declopt_.length / 2;
    self = d3.select(this);
    var suit = V.abbrv[d.id.slice(-1)];
    for (var j = 0; j < d.n; ++j) {
      var x = (i - mid) * W_ + 800,
          y = T_ + (2 - j) * H_ + 600;
      self.append("text")
        .attr("x", x).attr("y", y)
        .attr("dy", V.TxtDy)
        .attr("class", "poker " + suit)
        .text(V.Poker[suit + "0"].text);
    }
  });

  function genopt() {
    var opt = [];
    var i, j, s, t;

    if (declarer_ == me_.id) {

      s = domsuit_.suit;
      for (i = domsuit_.n + 1; i <= cnt_[s]; ++i)
        opt.push({id: i + s[0], n: i});

    } else if (declarer_ >= 0) {

      if (dealer_ < 0) {
        for (s in color_) {
          if (cnt_[s]) {

            if (cnt_[s] >= domsuit_.n) {
              if (cnt_[s] >= 2 && level_[s] > level_[domsuit_.suit])
                opt.push({id: domsuit_.n + s[0], n: domsuit_.n});
              for (i = domsuit_.n + 1; i <= cnt_[s]; ++i)
                opt.push({id: i + s[0], n: i});
            }

            for (i = 0; i < color_[s].length; ++i) {
              t = color_[s][i];
              if (cnt_[t] >= domsuit_.n) {
                if (level_[t] > level_[domsuit_.suit])
                  opt.push({id: domsuit_.n + t[0], n: domsuit_.n});
                for (j = domsuit_.n + 1; j <= cnt_[t]; ++j)
                  opt.push({id: j + t[0], n: j});
              }
            }
          }
        }
      }
    } else {

      for (s in color_) {
        if (cnt_[s]) {
          for (i = 2; i <= cnt_[s]; ++i)
            opt.push({id: i + s[0], n: i});

          for (i = 0; i < color_[s].length; ++i) {
            t = color_[s][i];
            for (j = 1; j <= cnt_[t]; ++j)
              opt.push({id: j + t[0], n: j});
          }
        }
      }
    }

    return opt;
  }

  function update() {
    var drawend = !store.session("drawing");
    var opt = genopt();
    var g = d3decl_.selectAll("g")
          .data(opt, function(d) { return d.id; });

    if (drawend &&
        dealer_ == me_.id && store.session("kittied")) {
        socket.emit("agreed", declarer_);
    } else {
      if (opt.length) {
        g.attr("class", "decl-ok")
          .on("click", function(d, i) {
            socket.emit("declaring", {
              id: me_.id, suit: V.abbrv[d.id.slice(-1)], n: d.n}); })
          .selectAll("text").text(function(d) {
            return V.Poker[V.abbrv[d.id.slice(-1)]].text;
          });

        lighton.attr("visibility", "visible");

        if (drawend) enabled(true);
      } else {
        lighton.attr("visibility", "hidden");
        if (drawend) {
          if (declarer_ != me_.id)
            socket.emit("agreed", declarer_);
          enabled(false);
        }
      }

      g.exit()
        .attr("class", "decl-no")
        .on("click", null)
        .selectAll("text").text(function(d) {
          return V.Poker[V.abbrv[d.id.slice(-1)] + "0"].text;
        });
    }
  }

  var self = {};

  self.update = update;

  self.declared = function() {
    declarer_ = store.session("declarer");
    domsuit_ = store.session("domsuit");

    if (declarer_ == me_.id) {
      var s = domsuit_.suit;
      if (s in color_)
        cnt_[s] -= domsuit_.n;
      else if ("spade" == s || "club" == s)
        --cnt_.blackjoker;
      else
        --cnt_.redjoker;
    }

    update();
  };

  self.newcard = function(card) {
    if (card.slice(0, -1) == domrank_)
      ++cnt_[V.abbrv[card.slice(-1)]];
    update();
  };

  self.change_dealer = function() {
    dealer_ = store.session("dealer");
    domrank_ = "" + store.session("domrank");

    if (dealer_ < 0) return;

    var i, mycards;
    mycards = store.session("mycards") || [];
    for (i in cnt_) cnt_[i] = 0;
    for (i = 0; i < mycards.length; ++i) {
      var card = mycards[i].val;
      if (card.slice(0, -1) == domrank_)
        ++cnt_[V.abbrv[card.slice(-1)]];
    }

    update();
  };

  function enabled (e) {
    if (typeof e != "undefined") {
      enabled_ = e;

      if (enabled_) {
        me_ = store.session("me");
        dealer_ = store.session("dealer");
        d3decl_.transition().attr("opacity", 1)
          .each("end", function() {
            d3decl_.attr("visibility", "visible"); });
      } else {
        lighton.attr("visibility", "hidden");
        d3decl_.transition().attr("opacity", 0)
          .each("end", function() {
            d3decl_.attr("visibility", "hidden"); });
      }
    }

    return enabled_;
  }

  self.enabled = enabled;

  return self;
};
