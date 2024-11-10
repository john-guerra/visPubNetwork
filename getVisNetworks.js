/* global d3 */

//builds a d3 network of author citations
const getCitationNetwork = function (data, minLinkValue) {
  let nodes = [],
    edges = [];
  let nodesMap = new Map();
  let papersMap = new Map();
  let edgesCount = new Map();

  minLinkValue = minLinkValue !== undefined ? minLinkValue : 10;

  function getNodeOrCreate(t, node) {
    if (!nodesMap.has(t)) {
      nodesMap.set(t, {
        name: t,
        value: 0,
        numPapers: 0,
        node: node,
        cluster: null,
      });
    }
    return nodesMap.get(t);
  }

  function addCount(t, onode, value) {
    let node = getNodeOrCreate(t, onode);
    node[value] += 1;
    nodesMap.set(t, node);
    return node;
  }

  data.forEach(function (d) {
    papersMap.set(d.Link, d);
    papersMap.set(d.DOI, d);
  });

  data.forEach(function (d) {
    if (d.InternalReferences === undefined || !d.InternalReferences) {
      return;
    }
    let citations;
    if (d.InternalReferences.indexOf(",") !== -1) {
      citations = d.InternalReferences.split(",");
    } else {
      citations = d.InternalReferences.split(";");
    }
    if (!citations) return;

    let source = d;

    citations.forEach(function (c) {
      if (!c) return;
      let target = papersMap.get(c);
      if (!target) return;

      (source["AuthorNames-Deduped"]||source["AuthorNames"]).split(";").forEach(function (sa) {
        addCount(sa, source, "numPapers");
        (target["AuthorNames-Deduped"]||target["AuthorNames"]).split(";").forEach(function (ta) {
          addCount(ta, target, "value");
          // if (sa==="Cox, D. C." || ta==="Cox, D. C.") { return; }
          if (sa === ta) {
            return;
          }
          let key = sa + "|" + ta;
          if (edgesCount.has(key)) {
            edgesCount.set(key, edgesCount.get(key) + 1);
          } else {
            edgesCount.set(key, 0);
          }
        });
      });
    });
  });

  edges = Array.from(edgesCount.entries())
    .filter(function (d) {
      return d[1] > minLinkValue;
    })
    .map(function (d) {
      let t1, t2;
      t1 = d[0].split("|")[0];
      t2 = d[0].split("|")[1];
      let node1 = getNodeOrCreate(t1);
      let node2 = getNodeOrCreate(t2);
      if (node1.visible === undefined || node1.visible === 0) {
        node1.visible = d[1] > minLinkValue ? 1 : 0;
      }
      if (node2.visible === undefined || node2.visible === 0) {
        node2.visible = d[1] > minLinkValue ? 1 : 0;
      }
      if (nodes.indexOf(node1) === -1) {
        nodes.push(node1);
      }
      if (nodes.indexOf(node2) === -1) {
        nodes.push(node2);
      }
      return {
        source: node1,
        target: node2,
        type: "cites",
        value: d[1],
      };
    });
  return { nodes: nodes, links: edges };
};

//builds a d3 network author collaboration
const getCoauthorNetwork = function (data, minLinkValue) {
  let nodes = [],
    edges = [];
  let nodesMap = new Map();
  let edgesCount = new Map();

  minLinkValue = minLinkValue !== undefined ? minLinkValue : 10;

  function getNodeOrCreate(t) {
    let node;
    if (!nodesMap.has(t)) {
      nodesMap.set(t, { name: t, value: 0, visible: false, cluster: "-1" });
    }
    return nodesMap.get(t);
  }

  function addCount(t) {
    let node = getNodeOrCreate(t);
    node.value += 1;
    nodesMap.set(t, node);
    return node;
  }

  data.forEach(function (d) {
    let author = (d["AuthorNames-Deduped"]||d["AuthorNames"]);
    if (!author) {
      console.log("🚫 paper without authors", d.Title, d);
      return;
    }
    author = author.split(";");
    author.forEach(function (t1) {
      author.forEach(function (t2) {
        if (t1 === t2) {
          return;
        }
        addCount(t1);
        addCount(t2);

        let key = t1 < t2 ? t1 + "|" + t2 : t2 + "|" + t1;
        if (edgesCount.has(key)) {
          edgesCount.set(key, edgesCount.get(key) + 1);
        } else {
          edgesCount.set(key, 0);
        }
      });
    });
  });

  edges = Array.from(edgesCount.entries())
    .filter(function (d) {
      return d[1] > minLinkValue;
    })
    .map(function (d) {
      let t1, t2;
      t1 = d[0].split("|")[0];
      t2 = d[0].split("|")[1];
      let node1 = getNodeOrCreate(t1);
      let node2 = getNodeOrCreate(t2);
      if (node1.visible === undefined || node1.visible === 0) {
        node1.visible = d[1] > minLinkValue ? 1 : 0;
      }
      if (node2.visible === undefined || node2.visible === 0) {
        node2.visible = d[1] > minLinkValue ? 1 : 0;
      }

      if (nodes.indexOf(node1) === -1) {
        nodes.push(node1);
      }
      if (nodes.indexOf(node2) === -1) {
        nodes.push(node2);
      }
      return {
        source: node1,
        target: node2,
        value: d[1],
      };
    });
  return { nodes: nodes, links: edges };
};
