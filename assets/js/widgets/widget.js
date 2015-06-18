module.exports = function(socket) {

  var ratio_ = 16 / 9;
  var $window = jQuery(window);
  var svg = d3.select("body").insert("svg")
        .attr("preserveAspectRatio", "xMinYMin meet");

  svg.selectAll("line").data([150, 300, 450, 600, 750])
    .enter().append("line")
    .style("stroke", "gray")
    .attr("x1", 0).attr("y1", function(d) { return d; })
    .attr("x2", 1600).attr("y2", function(d) { return d; });

  function resize() {
    var svgH, svgW;
    var ratio = $window.width() / $window.height();
    if (ratio > ratio_) {
      svgH = $window.height() - 10;
      svgW = Math.floor(svgH * ratio_);
    } else {
      svgW = $window.width() - 10;
      svgH = Math.floor(svgW / ratio_);
    }

    svg
      .style("width", svgW + "px")
      .style("height", svgH + "px")
      .style("top", ($window.height() - svgH) / 2 + "px")
      .style("left", ($window.width() - svgW) / 2 + "px")
      .attr("viewBox", "0, 0, 1600, 900");
  }

  resize();
  $window.resize(resize);

  var mycard = require("./mycard.js")(svg, socket);

  return {
    avatar: require("./avatar.js")(svg, socket),
    mycard: mycard,
    declarer: mycard.declarer,
    echo: require("./echo.js")(svg)
  };
};
