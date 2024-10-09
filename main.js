/* global d3, console: true, getCoauthorNetwork, getCitationNetwork, netClustering, forceInABox, navio  */

let url = "IEEE VIS papers 1990-2022 - Main dataset.csv";

let w = 800,
  h = 600;

let MIN_NODE_VAL = 200;
let MIN_EDGE_VAL = 5;

let network;
// let type = "Citations";
let data;
let selected;

d3.select("#checkboxGroup").on("change", reload);
d3.select("#selectType").on("change", reload);
d3.select("#sliderMinLink")
  .on("change", reload)
  .on("input", function () {
    d3.select("#sliderLabelMinLink").html(
      "Min link value: " + d3.select("#sliderMinLink").property("value")
    );
  });
d3.select("#sliderMinNode")
  .on("change", reload)
  .on("input", function () {
    d3.select("#sliderLabelMinNode").html(
      "Min node value (labels): " +
        d3.select("#sliderMinNode").property("value")
    );
  });

let canvas = d3
  .select("#chart")
  .append("canvas")
  .attr("width", w)
  .attr("height", h);

const scale = window.devicePixelRatio;
canvas.width = w * scale;
canvas.height = h * scale;
let context = canvas.node().getContext("2d");
context.scale(scale, scale);
// context.imageSmoothingEnabled =
//   context.mozImageSmoothingEnabled =
//   context.webkitImageSmoothingEnabled =
//     false;
context.globalCompositeOperation = "source-over";

let nv = new navio(d3.select("#navio"), 300);

// let svg = d3.select("#chart").append("svg:svg")
//   .attr("width", w)
//   .attr("height", h);

// svg.append("svg:rect")
//   .attr("width", w)
//   .attr("height", h);

// Per-type markers, as they don"t inherit styles.
// svg.append("defs").selectAll("marker")
//   .data(["cites"])
//   .enter().append("marker")
//     .attr("id", function(d) { return d; })
//     .attr("viewBox", "0 -5 10 10")
//     .attr("refX", 30)
//     .attr("refY", -5)
//     .attr("markerWidth", 4)
//     .attr("markerHeight", 4)
//     .attr("orient", "auto")
//   .append("path")
//     .attr("d", "M0,-5L10,0L0,5");

// svg.append("svg:g").attr("id", "paths");
// svg.append("svg:g").attr("id", "nodes");
// svg.append("svg:g").attr("id", "texts");

const simulation = d3
  .forceSimulation()
  .force("collide", d3.forceCollide((n) => n.r).iterations(4))
  // .force("center", d3.forceCenter(w, h))
  .force("charge", d3.forceManyBody().strength(-5));

let groupingForce = forceInABox()
  .size([w / 2, h / 2])
  .enableGrouping(d3.select("#checkboxGroup").property("checked"))
  // .linkDistance(50)
  // .gravityOverall(0.001)
  .linkStrengthIntraCluster(0.1)
  .linkStrengthInterCluster(0.01)
  .strength(0.1);
// .charge(-100);

let rScale = d3.scaleLinear().range([1, 5]);
// let yScale = d3.scaleLinear().range([h - 20, 20]);
// let xScale = d3.scaleLinear().domain(["a".charCodeAt(0), "z".charCodeAt(0)]).range([0, w]);
let color = d3.scaleOrdinal(d3.schemeCategory10);
let lOpacity = d3.scaleLinear().range([0.1, 0.9]);

function nodeName(d) {
  return d.name + " (" + d.value + ")";
}

function nodeNameCond(d) {
  return d.value > MIN_NODE_VAL ? nodeName(d) : "";
}

function update(nodes, links) {
  // force = d3.layout.force()

  groupingForce
    .links(links)
    .enableGrouping(d3.select("#checkboxGroup").property("checked"));

  simulation
    .nodes(nodes)
    .force("grouping", groupingForce)
    .force(
      "links",
      d3.forceLink(links).distance(20).strength(groupingForce.getLinkStrength)
    )
    .on("tick", tick);

  simulation.alpha(0.3).restart();

  rScale.domain([
    0,
    d3.max(nodes, function (d) {
      return d.value;
    }),
  ]);
  // yScale.domain([
  //   0,
  //   d3.max(nodes, function(d) {
  //     return d.value;
  //   })
  // ]);
  lOpacity.domain(
    d3.extent(links, function (d) {
      return d.value;
    })
  );
  nodes.forEach((n) => (n.r = rScale(n.value)));

  // let dVisibleNodes = {};
  // nodes.map(function (n) {
  //   n.r = rScale(n.value);
  //   return dVisibleNodes[n.id] = true;
  // });
  // let visibleLinks = links.filter(function (d) {
  //   return dVisibleNodes[d.source.id]&&
  //     dVisibleNodes[d.target.id];
  // });

  let visible = nodes;
  let visibleLinks = links;

  let clusters = d3
    .groups(visible, (d) => d.cluster)
    .sort(function (a, b) {
      return b[1].length - a[1].length;
    });

  function tick() {
    // console.log("tick");

    context.clearRect(0, 0, w, h);
    if (simulation.alpha() < 0.05) {
      context.save();
      context.globalAlpha = visibleLinks.length > 500 ? 0.03 : 0.3;
      visibleLinks.forEach(drawLink);
      context.restore();
    }
    context.save();
    clusters.forEach(function (cluster) {
      context.beginPath();
      context.globalAlpha = 1;
      cluster[1].forEach(drawNode(visible.length > 100 ? 1 : 2));
      context.fillStyle = color(cluster[0]);
      context.fill();
    });
    context.restore();

    if (selected) {
      // eraseNodeText(selected)
      // contextText.beginPath();
      // contextText.fillStyle = "black";
      drawNodeText(selected);
      // contextText.fill();
    }

    context.restore();

    // // Only draw links when the network settles down
    // if (simulation.alpha() < 0.05) {
    //   path.attr("d", function(d) {
    //     // let dx = d.target.x - d.source.x,
    //     //     dy = d.target.y - d.source.y,
    //     //     dr = Math.sqrt(dx * dx + dy * dy);
    //     // return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
    //     return (
    //       "M" +
    //       d.source.x +
    //       "," +
    //       d.source.y +
    //       "L" +
    //       d.target.x +
    //       "," +
    //       d.target.y
    //     );
    //   });
    // }

    // circle.attr("transform", function(d) {
    //   return "translate(" + d.x + "," + d.y + ")";
    // });

    // text.attr("transform", function(d) {
    //   return "translate(" + d.x + "," + d.y + ")";
    // });
  }
}

function reload() {
  MIN_EDGE_VAL = d3.select("#sliderMinLink").property("value");
  MIN_NODE_VAL = d3.select("#sliderMinNode").property("value");

  data.forEach((d) => (d.cluster = 1));

  function redraw(visible) {
    if (d3.select("#selectType").property("value") === "Coauthorship") {
      network = getCoauthorNetwork(visible, MIN_EDGE_VAL);
      console.log(network);
    } else {
      network = getCitationNetwork(visible, MIN_EDGE_VAL);
      console.log(network);
    }

    netClustering.cluster(network.nodes, network.links);
    update(network.nodes, network.links);
  }

  nv.data(data);
  nv.addAllAttribs();
  nv.updateCallback(redraw);

  redraw(data);

  d3.select("#downloadButton").on("click", function () {
    downloadData(network);
  });
}

d3.csv(url, d3.autoType).then(function (mdata) {
  console.log("Loaded data", mdata);
  canvas
    .on("mousemove", onHover)
    .call(
      d3
        .drag()
        .container(canvas)
        .subject(dragsubject)
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

  function dragsubject(event) {
    const [x, y] = d3.pointer(event);
    return simulation.find(x, y);
  }
  data = mdata;
  reload();
});

function downloadData(network) {
  //Code from http://stackoverflow.com/questions/11849562/how-to-save-the-output-of-a-console-logobject-to-a-file

  if (!network) {
    console.error("Console.save: No network");
    return;
  }
  let netProcessed = {};
  netProcessed.links = network.links.map(function (d) {
    return {
      source: network.nodes.indexOf(d.source),
      target: network.nodes.indexOf(d.target),
      type: d.type,
      value: d.value,
    };
  });
  netProcessed.nodes = network.nodes.map(function (d) {
    let e = {};
    let attr;
    for (attr in d) {
      if (attr === "node") continue;
      e[attr.replace(new RegExp("[^A-Za-z0-9]", "g"), "")] = d[attr];
    }
    e.node = {};
    for (attr in d.node) {
      e.node[attr.replace(new RegExp("[^A-Za-z0-9]", "g"), "")] = d.node[attr];
    }
    return e;
  });

  //Remove spaces from keys

  let filename = "network.json";

  if (typeof netProcessed === "object") {
    netProcessed = JSON.stringify(netProcessed, undefined, 4);
  }

  let blob = new Blob([netProcessed], { type: "text/json" }),
    e = document.createEvent("MouseEvents"),
    a = document.createElement("a");

  a.download = filename;
  a.href = window.URL.createObjectURL(blob);
  a.dataset.downloadurl = ["text/json", a.download, a.href].join(":");
  e.initMouseEvent(
    "click",
    true,
    false,
    window,
    0,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null
  );
  a.dispatchEvent(e);
}

function dragstarted(event) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  event.subject.fx = event.subject.x;
  event.subject.fy = event.subject.y;
}

function dragged(event) {
  event.subject.fx = event.x;
  event.subject.fy = event.y;
}

function dragended(event) {
  if (!event.active) simulation.alphaTarget(0);
  event.subject.fx = null;
  event.subject.fy = null;
}

function drawLink(d) {
  context.beginPath();
  // context.strokeStyle = "rgba(180,180,180,0.01)";
  context.strokeStyle = color(d.target.cluster);
  // context.globalAlpha=0.03;
  context.moveTo(d.source.x, d.source.y);
  context.lineTo(d.target.x, d.target.y);
  context.stroke();
}

function drawNode(rFactor) {
  return function (d) {
    context.moveTo(d.x + (d.r * rFactor) / 2, d.y + (d.r * rFactor) / 2);
    context.arc(d.x, d.y, d.r * rFactor, 0, 2 * Math.PI);
  };
}

function drawNodeText(d) {
  context.beginPath();
  context.fillStyle = "black";
  context.moveTo(d.x + d.r / 2, d.y + d.r / 2 + 5);
  context.fillText(d.name, d.x, d.y);
  context.fill();
}

function onHover() {
  let mouse = d3.pointer(this);
  let d = simulation.find(mouse[0], mouse[1]);
  if (!d) return;
  // eraseNodeText(selected)
  selected = d;
  drawNodeText(selected);
  simulation.alpha(0.3).restart();
}
