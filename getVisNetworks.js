//builds a d3 network of author citations
getCitationNetwork = function (data, minLinkValue) {
    var nodes = [], edges = [];
    var nodesMap = d3.map();
    var papersMap = d3.map();
    var edgesCount = d3.map();

    minLinkValue = minLinkValue!==undefined? minLinkValue: 10;

    function getNodeOrCreate(t, node) {
        if (!nodesMap.has(t)) {
            nodesMap.set(t, {"name":t, "value":0, "numPapers": 0, "node":node});
        }
        return nodesMap.get(t);

    }

    function addCount(t, onode, value) {
        var node = getNodeOrCreate(t, onode);
        node[value]+=1;
        nodesMap.set(t, node);
        return node;
    }

    data.forEach(function (d) {
    	papersMap.set(d.filename, d);
    	papersMap.set(d["IEEE XPLORE Article Number"], d);
    });

    data.forEach(function (d) {
    	if (d.Citations === undefined) {
    		return;
    	}
        var citations;
        if (d.Citations.indexOf(",")!== -1) {
        	citations = d.Citations.split(",");
        }else {
        	citations = d.Citations.split(";");
        }

        var source = d;
        citations.forEach(function (c) {
        	var target = papersMap.get(c);

        	source["Deduped author names"].split(";").forEach(function (sa){
                addCount(sa, target, "numPapers");
        		target["Deduped author names"].split(";").forEach(function (ta){
        			addCount(ta, target, "value");
        			if (sa==="Cox, D. C." || ta==="Cox, D. C.") { return; }
        			if (sa===ta) { return; }
        			var key = sa + "|" + ta;
	                if (edgesCount.has(key)){
	                    edgesCount.set(key, edgesCount.get(key) + 1 );
	                } else {
	                    edgesCount.set(key, 0);
	                }

        		});
        	});
        });
    });


    edges = edgesCount.entries().filter(function (d) { return d.value > minLinkValue; } ).map(function (d)  {
        var t1,t2;
        t1 = d.key.split("|")[0];
        t2 = d.key.split("|")[1];
        var node1 = getNodeOrCreate(t1);
        var node2 = getNodeOrCreate(t2);
        if (nodes.indexOf(node1)===-1) { nodes.push(node1); }
        if (nodes.indexOf(node2)===-1) { nodes.push(node2); }
        return {
            source:node1,
            target:node2,
            type:"cites",
            value:d.value
        };
    });
    return {"nodes":nodes, "edges":edges};
};

//builds a d3 network author collaboration
getCoauthorNetwork = function (data, minLinkValue) {
    var nodes = [], edges = [];
    var nodesMap = d3.map();
    var edgesCount = d3.map();

    minLinkValue = minLinkValue!==undefined? minLinkValue: 10;

    function getNodeOrCreate(t) {
        var node;
        if (!nodesMap.has(t)) {
            nodesMap.set(t, {"name":t, "value":0});
        }
        return nodesMap.get(t);

    }

    function addCount(t) {
        var node = getNodeOrCreate(t);
        node.value+=1;
        nodesMap.set(t, node);
        return node;
    }

    data.forEach(function (d) {
        var author = d["Deduped author names"].split(";");
        author.forEach(function (t1) {
            author.forEach(function (t2) {
                if (t1===t2) {
                    return;
                }
                addCount(t1);
                addCount(t2);

                var key = t1<t2 ? t1 + "|" + t2 : t2 + "|" + t1;
                if (edgesCount.has(key)){
                    edgesCount.set(key, edgesCount.get(key) + 1 );
                } else {
                    edgesCount.set(key, 0);
                }

            });
        });
    });


    edges = edgesCount.entries().filter(function (d) { return d.value > minLinkValue; } ).map(function (d)  {
        var t1,t2;
        t1 = d.key.split("|")[0];
        t2 = d.key.split("|")[1];
        var node1 = getNodeOrCreate(t1);
        var node2 = getNodeOrCreate(t2);
        if (nodes.indexOf(node1)===-1) { nodes.push(node1); }
        if (nodes.indexOf(node2)===-1) { nodes.push(node2); }
        return {
            source:node1,
            target:node2,
            value:d.value
        };
    });
    return {"nodes":nodes, "edges":edges};
};