module.exports = function() {

  // var V = require("./var.js");

  var V = {};
  V.abbr = {
    s: "spade", c: "club", h: "heart", d: "diamond",
    r: "redjoker", b: "blackjoker"
  };

  var N = {"0": 0, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
           "8": 8, "9": 9, "10": 10, "j": 11, "q": 12, "k": 13,
           "a": 14, "dr0": 15, "dr1": 16, "b": 17, "r": 18};

  var RANK = [];

  var NDECK = 3;
  var domsuit_;
  var domrank_;
  var shape_ = {spade: {}, diamond: {}, club: {}, heart: {}, trump: {}};
  var rule_ = {};

  var self = {};

  function get_suit(s) {
    return ("r" == s ||
            "b" == s ||
            domsuit_[0] == s) ? "trump" : V.abbr[s];
  }

  function encode_suit(cnt, suit) {
  }

  function encode(cards, shape) {
    var i, s, r;
    var s1, r1, n1, n2, nseq;

    var tmp = {spade: {}, diamond: {}, club: {}, heart: {}, trump: {}};
  }

  self.init = function(cards, domrank, domsuit) {
    var suit, rank, shp, n, i, nseq,
        pre_n, pre_suit, pre_rank;

    for (suit in shape_) {
      shp = shape_[suit];
      shp.n = cards.length;
      shp.stat = [];
      for (i = 0; i < NDECK; ++i)
        shp.stat.push({n: 0, d: []});
    }

    domsuit_ = domsuit;
    domrank_ = domrank;

    encode(cards, shape_);

    return shape_;
  };

  self.update = function(cards) {
    var suit;

    suit = get_suit(cards.slice(-1));
    rule_ = {};
    rule_[suit] = {n: cards.length, stat: []};

    encode(cards, rule_);

    return rule_;
  };

  self.ok = function(cards) {
    var shape = encode(cards);

    // If cards have the same shape as rule_, return its points.
    // Otherwise return -1, indicating invalid playing.
    return -1;
  };

  return self;
};
