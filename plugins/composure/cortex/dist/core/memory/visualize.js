/**
 * Memory graph visualization — generates self-contained HTML
 * with D3.js force-directed graph of memory nodes and edges.
 *
 * Nodes colored by content_type, sized by edge count.
 * Edges labeled by relationship_type.
 */
export async function generateMemoryHtml(adapter, params) {
    try {
        // Fetch all nodes and edges for this agent
        const nodesResult = await adapter.searchMemory({
            agent_id: params.agent_id,
            limit: 500,
        });
        if (nodesResult.length === 0) {
            return { status: "ok", message: "No memory nodes found — nothing to visualize." };
        }
        // Collect all node IDs, then fetch edges for each
        const allEdges = [];
        const nodeIds = new Set(nodesResult.map((n) => n.id));
        for (const node of nodesResult) {
            const edges = await adapter.getEdgesForNode(node.id);
            for (const edge of edges) {
                // Only include edges where both nodes are in our result set
                if (nodeIds.has(edge.from_node_id) && nodeIds.has(edge.to_node_id)) {
                    // Deduplicate
                    if (!allEdges.some((e) => e.id === edge.id)) {
                        allEdges.push(edge);
                    }
                }
            }
        }
        const typeColors = {
            text: "#3b82f6",
            fact: "#10b981",
            markdown: "#6366f1",
            document: "#f59e0b",
            conversation: "#8b5cf6",
        };
        const relationColors = {
            related_to: "#94a3b8",
            follows: "#3b82f6",
            contradicts: "#ef4444",
            supports: "#10b981",
            contains: "#6366f1",
            derived_from: "#f59e0b",
        };
        const nodesJson = JSON.stringify(nodesResult.map((n) => ({
            id: n.id,
            label: n.content.substring(0, 60) + (n.content.length > 60 ? "..." : ""),
            content: n.content,
            type: n.metadata?.category ?? "text",
            color: typeColors[n.metadata?.category] ?? typeColors.text,
            metadata: n.metadata,
            relevance: n.relevance_score,
        })));
        const edgesJson = JSON.stringify(allEdges.map((e) => ({
            source: e.from_node_id,
            target: e.to_node_id,
            type: e.relationship_type,
            weight: e.weight,
            color: relationColors[e.relationship_type] ?? "#94a3b8",
        })));
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cortex Memory Graph</title>
<script src="https://d3js.org/d3.v7.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; overflow: hidden; }
  svg { width: 100vw; height: 100vh; }
  .node circle { cursor: pointer; stroke: #1e293b; stroke-width: 2; }
  .node text { font-size: 10px; fill: #94a3b8; pointer-events: none; }
  .link { stroke-opacity: 0.4; }
  .link-label { font-size: 8px; fill: #64748b; }
  #panel { position: fixed; top: 1rem; right: 1rem; width: 320px; background: #1e293b; border-radius: 8px; padding: 1rem; display: none; max-height: 80vh; overflow-y: auto; }
  #panel h3 { font-size: 0.875rem; color: #e2e8f0; margin-bottom: 0.5rem; }
  #panel p { font-size: 0.75rem; color: #94a3b8; line-height: 1.5; margin-bottom: 0.5rem; }
  #panel .tag { display: inline-block; background: #334155; border-radius: 4px; padding: 2px 6px; font-size: 0.625rem; margin: 2px; }
  #stats { position: fixed; bottom: 1rem; left: 1rem; font-size: 0.75rem; color: #64748b; }
  #legend { position: fixed; top: 1rem; left: 1rem; font-size: 0.75rem; }
  #legend div { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  #legend span.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
</style>
</head>
<body>
<svg id="graph"></svg>
<div id="panel"></div>
<div id="stats"></div>
<div id="legend">
  <div><span class="dot" style="background:#3b82f6"></span> text</div>
  <div><span class="dot" style="background:#10b981"></span> fact</div>
  <div><span class="dot" style="background:#6366f1"></span> markdown</div>
  <div><span class="dot" style="background:#f59e0b"></span> document</div>
  <div><span class="dot" style="background:#8b5cf6"></span> conversation</div>
</div>
<script>
const nodes = ${nodesJson};
const links = ${edgesJson};

document.getElementById('stats').textContent =
  nodes.length + ' nodes · ' + links.length + ' edges — Composure Cortex Memory Graph';

const svg = d3.select('#graph');
const width = window.innerWidth;
const height = window.innerHeight;

const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id).distance(120))
  .force('charge', d3.forceManyBody().strength(-200))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(30));

const g = svg.append('g');

svg.call(d3.zoom().scaleExtent([0.1, 4]).on('zoom', (e) => g.attr('transform', e.transform)));

const link = g.append('g').selectAll('line')
  .data(links).join('line')
  .attr('class', 'link')
  .attr('stroke', d => d.color)
  .attr('stroke-width', d => Math.max(1, d.weight * 3));

const node = g.append('g').selectAll('g')
  .data(nodes).join('g')
  .attr('class', 'node')
  .call(d3.drag()
    .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
    .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
  );

node.append('circle')
  .attr('r', 8)
  .attr('fill', d => d.color)
  .on('click', (e, d) => {
    const panel = document.getElementById('panel');
    const tags = (d.metadata?.tags || []).map(t => '<span class="tag">' + t + '</span>').join('');
    panel.innerHTML = '<h3>' + d.label + '</h3><p>' + d.content + '</p>' +
      (d.metadata?.category ? '<p><strong>Category:</strong> ' + d.metadata.category + '</p>' : '') +
      (tags ? '<p>' + tags + '</p>' : '') +
      '<p style="color:#475569">ID: ' + d.id.substring(0,8) + '...</p>';
    panel.style.display = 'block';
  });

node.append('text')
  .attr('dx', 12).attr('dy', 4)
  .text(d => d.label.substring(0, 30));

simulation.on('tick', () => {
  link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
  node.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
});
</script>
</body>
</html>`;
        // Write to file if output_path provided
        if (params.output_path) {
            const { writeFileSync } = await import("node:fs");
            const { dirname } = await import("node:path");
            const { mkdirSync } = await import("node:fs");
            try {
                mkdirSync(dirname(params.output_path), { recursive: true });
            }
            catch { }
            writeFileSync(params.output_path, html);
            return {
                status: "ok",
                output_path: params.output_path,
                nodes: nodesResult.length,
                edges: allEdges.length,
                message: `Memory graph visualization written to ${params.output_path}`,
            };
        }
        return {
            status: "ok",
            html,
            nodes: nodesResult.length,
            edges: allEdges.length,
        };
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to generate memory visualization: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
//# sourceMappingURL=visualize.js.map