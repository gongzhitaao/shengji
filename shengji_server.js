"use strict";

var _ = require("underscore");

var self = {};

var STATE = {
  WAIT: "WAIT",
  DRAW: "DRAW",
  PLAY: "PLAY"
};

var NUMDECK = 3;
var SUIT = ["c", "d", "h", "s"];
var CARD = ["2", "3", "4", "5", "6", "7", "8", "9", "10",
            "j", "q", "k", "a"];
var JOKER = ["r", "b"];
var NUMCARD = 54;
var NKITTY = 6;

var ghost_ = {};
var names_ = {};

var cur_player_ = -1;
var leader_ = -1;
var ready_ = 0;
var blackout_ = false;
var dealer_got_kitty_ = false;
var last_kittiee_ = -1;
var agree_cnt_ = [0, 0, 0, 0];
agree_cnt_[-1] = 0;
var declarer_ = -1;
var declare_lock_ = false;
var domrank_ = ["2", "2"];
var domsuit_ = {suit: "dummy", n: 0};
var dealer_ = -1;
var kitty_ = [];

var NP = 4;
var player_cnt_ = 0;
var player_ = new Array(NP);
for (var i = 0; i < NP; ++i)
  player_[i] = {
    id: i,
    name: "",
    sock: null,
    pool: [],
    stat: {}
  };

function shuffle(arr) {
  var curind = arr.length, val, rndind;

  // While there remain elements to shuffle...
  while (0 !== curind) {

    // Pick a remaining element...
    rndind = Math.floor(Math.random() * curind);
    curind -= 1;

    // And swap it with the current element.
    val = arr[curind];
    arr[curind] = arr[rndind];
    arr[rndind] = val;
  }
}

self.serve = function(socket) {

  socket.join(STATE.WAIT);

  {
    var ret = [];
    for (var i = 0; i < NP; ++i) {
      var p = player_[i];
      if (p.name.length)
        ret.push({id: p.id, name: p.name});
    }
    socket.emit("hello", ret);
  }

  socket.on("login", function(d) {
    if (d in ghost_) {
      socket.emit("re:login", false);
    } else {
      ghost_[d] = -1;
      names_[socket.id] = d;
      socket.emit("re:login", d);
    }
  });

  socket.on("join", function(d) {
    var p = player_[d.id];
    p.name = d.name;
    p.id = d.id;
    p.sock = socket;
    ghost_[p.name] = p.id;
    socket.to(STATE.WAIT).emit("new player", d);
    socket.to(STATE.DRAW).emit("new player", d);
    ++player_cnt_;
  });

  function reset() {
    dealer_ = -1;
    domrank_ = "2";
    agree_cnt_ = [0, 0, 0, 0];
    agree_cnt_[-1] = 0;
  }

  function init() {
    var i, j, k, n, s, pool = [];
    for (k = 0; k < NUMDECK; ++k) {
      for (i = 0; i < JOKER.length; ++i)
        pool.push((dealer_ < 0 ? "2" : domrank_[dealer_ % 2]) + JOKER[i]);
      for (i = 0; i < SUIT.length; ++i) {
        s = SUIT[i];
        for (j = 0; j < CARD.length; ++j)
          pool.push(CARD[j] + s);
      }
    }

    shuffle(pool);
    n = (NUMCARD * NUMDECK - NKITTY) / NP;
    for (i = 0; i < NP; ++i)
      player_[i].pool = pool.slice(i * n, (i + 1) * n);
    kitty_ = pool.slice(NP * n);

    ready_ = 0;
    declarer_ = -1;
    domsuit_ = {suit: "", n: 0};
    agree_cnt_ = [0, 0, 0, 0];
    agree_cnt_[-1] = 0;
    blackout_ = false;
    dealer_got_kitty_ = false;
    last_kittiee_ = -1;
  }

  socket.on("ready", function() {
    socket.leave(STATE.WAIT);
    socket.join(STATE.DRAW);

    if (NP == ++ready_) {
      init();

      var i, p;

      for (i = 0; i < NP; ++i) {
        p = player_[i];
        p.sock.emit("dealer", {
          id: dealer_,
          domrank: dealer_ < 0 ? "2" : domrank_[dealer_ % 2]});
      }

      for (i = 0; i < NP; ++i) {
        p = player_[i];
        p.sock.emit("draw", p.pool);
      }
    }
  });

  var level_ = {
    "dummy": -1,
    "spade": 0, "club": 0, "heart": 0, "diamond": 0,
    "blackjoker": 1, "redjoker": 2};

  socket.on("declaring", function(d) {
    if ((dealer_ >= 0 && !declare_lock_) ||
        (dealer_ < 0 &&
         (d.n > domsuit_.n ||
          (d.n == domsuit_.n &&
           level_[d.suit] > level_[domsuit_.suit])))) {

      declare_lock_ = dealer_ >= 0;

      agree_cnt_[d.id] = 1;

      declarer_ = d.id;
      domsuit_.suit = d.suit;
      domsuit_.n = d.n;
      socket.emit("re:declaring", d);
      for (var i = 0; i < NP; ++i)
        player_[i].sock.emit("declared", d);
    } else {
      socket.emit("re:declaring",
                  {id: declarer_, suit: domsuit_.suit, n: domsuit_.n});
    }
  });

  function kitty(id) {
    agree_cnt_[declarer_] = 0;
    if (id == dealer_) dealer_got_kitty_ = true;

    if (last_kittiee_ == id) {
      leader_ = dealer_;
      cur_player_ = dealer_;
      for (var i = 0; i < NP; ++i)
        player_[i].sock.emit("prepare to play");
      player_[dealer_].sock.emit("play");
    } else {
      last_kittiee_ = id;

      player_[id].pool = player_[id].pool.concat(kitty_);
      player_[id].sock.emit("kitty", kitty_);
      for (i = 0; i < NP; ++i)
        player_[i].sock.emit("kittying");
    }
  }

  socket.on("agreed", function(id) {
    // Each player can declare.  When one other player agrees with the
    // declaration, the count for that player increment by 1.  The
    // first player with agree count of 4 wins the declaration.
    if (++agree_cnt_[id] < NP) return;

    if (dealer_ < 0) {
      // This means this is the first round, all players are trying to
      // become the dealer.

      if (declarer_ >= 0) {
        // If someone already declares with agree count of 4 (tested
        // at the beginning of the function), then he becomes the
        // first dealer.

        dealer_ = declarer_;
        for (i = 0; i < NP; ++i) {
          player_[i].sock.emit(
            "dealer", {id: dealer_, domrank: domrank_[dealer_ % 2]});
        }
      } else {
        // No one declares yet (declarer_ == -1), but we got agree
        // count of 4, this means no one can declare.  So we randomly
        // determin the dealer for the first round.

        declarer_ = dealer_ = Math.floor(Math.random() * 4);
        for (i = 0; i < NP; ++i) {
          player_[i].sock.emit(
            "dealer", {id: dealer_, domrank: domrank_[dealer_ % 2]});
          player_[i].sock.emit("declared", {id: dealer_, suit: "redjoker", n: 3});
        }
      }

      kitty(dealer_);
    } else {
      // This is not the first round.

      if (declarer_ >= 0) {
        // If someone declares, if dealer has not got the kitty yet,
        // dealer has the kitty.  Otherwise, the declarer got the
        // kitty.

        if (dealer_got_kitty_) kitty(declarer_);
        else kitty(dealer_);
      } else {
        // If no one declares, we have a blackout here.

        if (blackout_) {
          // Neither side is able to declare, then the original dealer
          // is still the dealer, and dominant suit is set to
          // No-Trump (NT).

          declarer_ = dealer_ = (dealer_ - 1 + NP) % NP;
          for (i = 0; i < NP; ++i) {
            player_[i].sock.emit(
              "dealer", {id: dealer_, domrank: domrank_[dealer_ % 2]});
            player_[i].sock.emit("declared", {id: dealer_, suit: "redjoker", n: 3});
          }
          kitty(dealer_);
        } else {
          // The declarers blackout.  So declarers and opponents exchange.

          blackout_ = true;
          agree_cnt_ = [0, 0, 0, 0];
          agree_cnt_[-1] = 0;
          dealer_ = (dealer_ + 1) % NP;
          for (i = 0; i < NP; ++i)
            player_[i].sock.emit(
              "dealer", {id: dealer_, domrank: domrank_[dealer_ % 2]});
        }
      }
    }
  });

  socket.on("re:kitty", function(d) {
    declare_lock_ = false;
    kitty_ = d.slice(0);

    var p = player_[last_kittiee_];
    kitty_.forEach(function(d) {
      p.pool.splice(_.sortedIndex(p.pool, d), 1); });

    for (var i = 0; i < NP; ++i)
      player_[i].sock.emit("kittied");
  });

  socket.on("disconnect", function() {
    var name = names_[socket.id];
    var id = ghost_[name];

    if (id >= 0) {
      socket.to(STATE.WAIT).emit("user left", {
        name: "",
        id: id
      });

      socket.to(STATE.DRAW).emit("user left", {
        name: "",
        id: id
      });

      player_[id].sock = null;
      player_[id].name = "";
      player_[id].pool = [];
      player_[id].stat = {};
      --player_cnt_;

      if (!player_cnt_) reset();
    }

    delete ghost_[names_[socket.id]];
    delete names_[socket.id];
  });

};

module.exports = self;
