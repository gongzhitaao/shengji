module.exports = function(svg) {

  var text = svg.append("g")
        .attr("class", "echo")
        .attr("transform", "translate(800, 375)")
        .append("text")
        .attr("text-anchor", "middle")
        .attr("opacity", 0);

  var self = {};

  self.info = function(d) {
    text.text(d)
      .attr("class", "info")
      .transition()
      .attr("opacity", 1)
      .transition().duration(3000)
      .attr("opacity", 0);
  };

  self.warning = function(d) {
    text.text(d)
      .attr("class", "warning")
      .transition()
      .attr("opacity", 1)
      .transition().duration(3000)
      .attr("opacity", 0);
  };

  self.error = function(d) {
    text.text(d)
      .attr("class", "error")
      .transition()
      .attr("opacity", 1)
      .transition().duration(3000)
      .attr("opacity", 0);
  };

  return self;
};
