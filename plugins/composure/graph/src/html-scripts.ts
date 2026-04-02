/**
 * Browser-runtime JavaScript for the graph HTML visualization.
 *
 * Returns template strings of client-side JS that runs in the browser.
 * The untyped `var x = {}` patterns are intentional — this is browser JS.
 *
 * Decomposed into focused sections: data, controls, graph logic,
 * detail panel, tree view, entity view, and render loop.
 */

import type { VisNode, VisEntity } from "./html-template.js";
import { CATEGORY_META, esc, jsonInject } from "./html-template.js";

// ── Data constants ────────────────────────────────────────────────

/** Data constants, edge/reverse-dep maps, sizing, state variables. */
export function buildScriptData(nodes: VisNode[], catsPresent: string[], entities: VisEntity[]): string {
  const colorsObj: Record<string, string> = {};
  const labelsObj: Record<string, string> = {};
  for (const c of catsPresent) {
    const m = CATEGORY_META[c] ?? { label: c, color: "#94a3b8" };
    colorsObj[c] = m.color;
    labelsObj[c] = m.label;
  }
  return `
var NODES=${jsonInject(nodes)},COLORS=${jsonInject(colorsObj)},CAT_LABELS=${jsonInject(labelsObj)},CAT_ORDER=${jsonInject(catsPresent)};
var ENTITIES=${jsonInject(entities)};
var EDGES=[],nodeMap={},reverseDeps={};
NODES.forEach(function(n){nodeMap[n.id]=n;});
NODES.forEach(function(n){(n.imports||[]).forEach(function(t){if(nodeMap[t])EDGES.push({source:n.id,target:t});});});
NODES.forEach(function(n){reverseDeps[n.id]=[];});
EDGES.forEach(function(e){if(reverseDeps[e.target])reverseDeps[e.target].push(e.source);});
var NODE_W=190,NODE_H=34,COL_GAP=220,ROW_GAP=42,PAD_X=44,PAD_Y=52;
var currentFilter="all",selectedNode=null,selectedEntity=null,entityMemberSet=null,searchTerm="",zoom=0.85;
var hiddenCats=new Set();
`;
}

// ── Controls ──────────────────────────────────────────────────────

/** Theme toggle, search, zoom, legend toggle + clickable legend items. */
export function buildScriptControls(): string {
  return `
var searchBox=document.getElementById("searchBox");

// ── Theme toggle ──────────────────────────────────────────────
var themeBtn=document.getElementById("themeToggle");
var moonPath='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z';
var sunPath='M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42';
(function initTheme(){
  var saved=localStorage.getItem("composure-theme");
  if(saved)document.documentElement.setAttribute("data-theme",saved);
  updateThemeIcon();
})();
function updateThemeIcon(){
  var isDark=document.documentElement.getAttribute("data-theme")!=="light";
  document.getElementById("themeIcon").innerHTML=isDark
    ?'<path d="'+moonPath+'"/>'
    :'<circle cx="12" cy="12" r="5"/><path d="'+sunPath+'"/>';
}
themeBtn.addEventListener("click",function(){
  var isDark=document.documentElement.getAttribute("data-theme")!=="light";
  document.documentElement.setAttribute("data-theme",isDark?"light":"dark");
  localStorage.setItem("composure-theme",isDark?"light":"dark");
  updateThemeIcon();
  render();
});

// ── Search ────────────────────────────────────────────────────
searchBox.addEventListener("input",function(e){searchTerm=e.target.value.toLowerCase();render();});

// ── Zoom ──────────────────────────────────────────────────────
document.getElementById("zoomIn").addEventListener("click",function(){zoom=Math.min(zoom+0.15,2);render();});
document.getElementById("zoomOut").addEventListener("click",function(){zoom=Math.max(zoom-0.15,0.3);render();});
document.getElementById("zoomReset").addEventListener("click",function(){zoom=0.85;render();});
document.getElementById("graphPanel").addEventListener("wheel",function(e){
  if(e.ctrlKey||e.metaKey){e.preventDefault();zoom=Math.max(0.3,Math.min(2,zoom+(e.deltaY<0?0.08:-0.08)));render();}
},{passive:false});

// ── Legend toggle + clickable category items ──────────────────
document.getElementById("legendToggle").addEventListener("click",function(){
  document.getElementById("legendBody").classList.toggle("hidden");
  document.getElementById("legendToggle").classList.toggle("collapsed");
});
document.querySelectorAll(".legend-item").forEach(function(el){
  el.addEventListener("click",function(){
    var cat=el.getAttribute("data-cat");
    if(hiddenCats.has(cat)){hiddenCats.delete(cat);el.classList.remove("hidden-cat");}
    else{hiddenCats.add(cat);el.classList.add("hidden-cat");}
    selectedNode=null;
    document.getElementById("detailPanel").classList.remove("open");
    render();
  });
});
`;
}

// ── Graph logic ───────────────────────────────────────────────

/** Layout algorithm, BFS blast radius, node selection. */
export function buildScriptGraphLogic(): string {
  return `
function layoutNodes(filter){
  var visible=NODES.filter(function(n){return !hiddenCats.has(n.cat);});
  if(searchTerm)visible=visible.filter(function(n){return n.label.toLowerCase().includes(searchTerm)||n.path.toLowerCase().includes(searchTerm);});
  var groups={},positions={};
  visible.forEach(function(n){(groups[n.cat]=groups[n.cat]||[]).push(n);});
  var cols=CAT_ORDER.filter(function(c){return groups[c];});
  cols.forEach(function(cat,ci){(groups[cat]||[]).forEach(function(n,ri){positions[n.id]={x:PAD_X+ci*COL_GAP,y:PAD_Y+ri*ROW_GAP};});});
  return{positions:positions,visible:visible,cols:cols};
}
function bfsRadius(startId,maxDepth){
  var visited=new Set([startId]),frontier=[startId];
  for(var d=0;d<maxDepth;d++){
    var next=[];
    frontier.forEach(function(nid){
      var node=nodeMap[nid];
      if(node)(node.imports||[]).forEach(function(t){if(!visited.has(t)){visited.add(t);next.push(t);}});
      (reverseDeps[nid]||[]).forEach(function(s){if(!visited.has(s)){visited.add(s);next.push(s);}});
    });
    frontier=next;if(frontier.length===0)break;
  }
  return visited;
}
function selectNode(id){selectedNode=id;render();}
`;
}

// ── Detail panel ──────────────────────────────────────────────

/** Detail panel builder — populates the right sidebar on node click. */
export function buildScriptDetailPanel(): string {
  return `
function buildDetail(node){
  var panel=document.getElementById("detailPanel");panel.innerHTML="";panel.classList.add("open");
  var color=COLORS[node.cat]||"#94a3b8";
  var deps=(node.imports||[]).map(function(i){return nodeMap[i];}).filter(Boolean);
  var consumers=(reverseDeps[node.id]||[]).map(function(i){return nodeMap[i];}).filter(Boolean);
  var radius=bfsRadius(node.id,2);
  var inner=document.createElement("div");inner.className="dp-inner";
  var h2=document.createElement("div");h2.className="dp-title";h2.style.color=color;h2.textContent=node.label;inner.appendChild(h2);
  var fp=document.createElement("div");fp.className="dp-path";fp.textContent=node.path;inner.appendChild(fp);
  var badges=document.createElement("div");badges.className="dp-badges";
  function addBadge(t,bg,fg){var s=document.createElement("span");s.className="dp-badge";s.textContent=t;s.style.background=bg;s.style.color=fg;badges.appendChild(s);}
  addBadge(CAT_LABELS[node.cat]||node.cat,color+"22",color);
  addBadge(node.language,"var(--surface-hover)","var(--text-dim)");
  if(node.isTest)addBadge("test","rgba(34,211,238,0.12)","#22d3ee");
  inner.appendChild(badges);
  var sg=document.createElement("div");sg.className="dp-stats";
  function addStat(l,v){var el=document.createElement("div");el.className="dp-stat";el.innerHTML='<div class="dp-stat-label">'+l+'</div><div class="dp-stat-value">'+v+'</div>';sg.appendChild(el);}
  addStat("Lines",node.lines);addStat("Functions",node.functions);addStat("Imports",deps.length);
  addStat("Imported by",consumers.length);addStat("Blast radius",radius.size);
  if(node.classes>0)addStat("Classes",node.classes);if(node.types>0)addStat("Types",node.types);
  inner.appendChild(sg);
  function addDepSection(title,items){
    if(!items.length)return;
    var st=document.createElement("div");st.className="dp-section-title";st.textContent=title;inner.appendChild(st);
    items.forEach(function(d){
      var li=document.createElement("div");li.className="dp-dep-item";
      li.addEventListener("click",function(){selectNode(d.id);});
      var dot=document.createElement("div");dot.className="dp-dep-dot";dot.style.background=COLORS[d.cat]||"#94a3b8";
      li.appendChild(dot);li.appendChild(document.createTextNode(d.label));inner.appendChild(li);
    });
  }
  addDepSection("Imports",deps);addDepSection("Imported by",consumers);
  if(consumers.length>=5){
    var sev=consumers.length>=10?"critical":"warn";
    var fc={warn:["rgba(251,191,36,0.08)","rgba(251,191,36,0.2)","#fbbf24"],critical:["rgba(239,68,68,0.08)","rgba(239,68,68,0.2)","#ef4444"]}[sev];
    var ft=document.createElement("div");ft.className="dp-section-title";ft.textContent="Review Notes";ft.style.marginTop="20px";inner.appendChild(ft);
    var fl=document.createElement("div");fl.className="dp-flag";fl.style.cssText="background:"+fc[0]+";border:1px solid "+fc[1]+";color:"+fc[2];
    fl.textContent="High fan-in: "+consumers.length+" files depend on this"+(sev==="critical"?" \\u2014 changes here have wide blast radius":"");inner.appendChild(fl);
  }
  if(deps.length===0&&consumers.length===0){
    var ft2=document.createElement("div");ft2.className="dp-section-title";ft2.textContent="Review Notes";ft2.style.marginTop="20px";inner.appendChild(ft2);
    var fl2=document.createElement("div");fl2.className="dp-flag";fl2.style.cssText="background:var(--surface);border:1px solid var(--border-soft);color:var(--text-muted)";
    fl2.textContent="Isolated file \\u2014 no import relationships detected";inner.appendChild(fl2);
  }
  panel.appendChild(inner);
}
`;
}

// ── Tree view ─────────────────────────────────────────────────

/** Tree view — builds folder hierarchy from paths, renders recursively. */
export function buildScriptTreeView(): string {
  return `
var currentView="tree";

function buildTreeData(){
  var root={name:"",children:{},files:[],stats:{count:0,lines:0}};
  var visible=NODES.filter(function(n){return !hiddenCats.has(n.cat);});
  if(searchTerm)visible=visible.filter(function(n){return n.label.toLowerCase().includes(searchTerm)||n.path.toLowerCase().includes(searchTerm);});
  visible.forEach(function(n){
    var parts=n.path.split("/");
    var cur=root;
    for(var i=0;i<parts.length-1;i++){
      if(!cur.children[parts[i]])cur.children[parts[i]]={name:parts[i],children:{},files:[],stats:{count:0,lines:0}};
      cur=cur.children[parts[i]];
    }
    cur.files.push(n);
  });
  function calcStats(node){
    var c=node.files.length,l=0;
    node.files.forEach(function(f){l+=f.lines;});
    Object.keys(node.children).forEach(function(k){
      var s=calcStats(node.children[k]);c+=s.count;l+=s.lines;
    });
    node.stats={count:c,lines:l};
    return node.stats;
  }
  calcStats(root);
  return root;
}

var expandedDirs=new Set();

function renderTreeView(){
  var panel=document.getElementById("treePanel");
  panel.innerHTML="";
  var tree=buildTreeData();
  function renderDir(dir,container,path){
    var keys=Object.keys(dir.children).sort();
    keys.forEach(function(k){
      var child=dir.children[k];
      var dirPath=path?path+"/"+k:k;
      var isExpanded=expandedDirs.has(dirPath)||!!searchTerm;
      var row=document.createElement("div");row.className="tree-dir";
      var arrow=document.createElement("span");
      arrow.className="tree-dir-arrow"+(isExpanded?"":" collapsed");
      arrow.textContent="\\u25B6";
      row.appendChild(arrow);
      var nameEl=document.createElement("span");nameEl.className="tree-dir-name";nameEl.textContent=k;row.appendChild(nameEl);
      var badge=document.createElement("span");badge.className="tree-dir-badge";
      badge.textContent=child.stats.count+" files";row.appendChild(badge);
      row.addEventListener("click",function(){
        if(expandedDirs.has(dirPath))expandedDirs.delete(dirPath);else expandedDirs.add(dirPath);
        renderTreeView();
      });
      container.appendChild(row);
      var childContainer=document.createElement("div");
      childContainer.className="tree-children"+(isExpanded?"":" collapsed");
      renderDir(child,childContainer,dirPath);
      child.files.sort(function(a,b){return a.label.localeCompare(b.label);}).forEach(function(f){
        var fileRow=document.createElement("div");fileRow.className="tree-file";
        if(selectedNode===f.id)fileRow.classList.add("selected");
        var dot=document.createElement("div");dot.className="tf-dot";dot.style.background=COLORS[f.cat]||"#94a3b8";
        fileRow.appendChild(dot);
        var name=document.createElement("span");name.className="tf-name";name.textContent=f.label;fileRow.appendChild(name);
        var lines=document.createElement("span");lines.className="tf-lines";lines.textContent=f.lines;fileRow.appendChild(lines);
        fileRow.addEventListener("click",function(e){e.stopPropagation();selectedNode=f.id;buildDetail(f);renderTreeView();});
        childContainer.appendChild(fileRow);
      });
      container.appendChild(childContainer);
    });
    dir.files.sort(function(a,b){return a.label.localeCompare(b.label);}).forEach(function(f){
      var fileRow=document.createElement("div");fileRow.className="tree-file";
      if(selectedNode===f.id)fileRow.classList.add("selected");
      var dot=document.createElement("div");dot.className="tf-dot";dot.style.background=COLORS[f.cat]||"#94a3b8";
      fileRow.appendChild(dot);
      var name=document.createElement("span");name.className="tf-name";name.textContent=f.label;fileRow.appendChild(name);
      var lines=document.createElement("span");lines.className="tf-lines";lines.textContent=f.lines;fileRow.appendChild(lines);
      fileRow.addEventListener("click",function(e){e.stopPropagation();selectedNode=f.id;buildDetail(f);renderTreeView();});
      container.appendChild(fileRow);
    });
  }
  renderDir(tree,panel,"");
}

// ── View toggle (tree sidebar always visible, graph/entities panels toggle) ─
var currentView="tree";
document.querySelectorAll(".vt-btn").forEach(function(btn){
  btn.addEventListener("click",function(){
    var view=btn.getAttribute("data-view");
    if(view===currentView)return;
    currentView=view;
    document.querySelectorAll(".vt-btn").forEach(function(b){b.classList.remove("active");});
    btn.classList.add("active");
    var gp=document.getElementById("graphPanel");
    var ep=document.getElementById("entitiesPanel");
    var zc=document.querySelector(".zoom-controls");
    var main=document.querySelector(".main");
    if(view==="graph"){
      gp.style.display="block";ep.classList.remove("open");main.style.display="flex";zc.style.display="";
      render();
    }else if(view==="entities"){
      gp.style.display="none";ep.classList.add("open");main.style.display="none";zc.style.display="none";
      renderEntityView();
    }else{
      gp.style.display="none";ep.classList.remove("open");main.style.display="flex";zc.style.display="none";
    }
  });
});
`;
}

// ── Render loop ───────────────────────────────────────────────

/** Main render loop — draws nodes, column headers, and canvas edges. */
export function buildScriptRender(): string {
  return `
function render(){
  renderTreeView();
  if(currentView==="tree")return;
  var isDark=document.documentElement.getAttribute("data-theme")!=="light";
  var layout=layoutNodes(currentFilter),positions=layout.positions,visible=layout.visible,cols=layout.cols;
  var graphCanvas=document.getElementById("graphCanvas");
  var connectedSet=selectedNode?bfsRadius(selectedNode,1):null;
  graphCanvas.innerHTML="";
  cols.forEach(function(cat,ci){
    var color=COLORS[cat]||"#94a3b8";
    var hdr=document.createElement("div");hdr.className="col-header";
    hdr.style.cssText="left:"+(PAD_X+ci*COL_GAP)+"px;top:16px;color:"+color;hdr.textContent=CAT_LABELS[cat]||cat;graphCanvas.appendChild(hdr);
    var line=document.createElement("div");line.className="col-line";
    line.style.cssText="left:"+(PAD_X+ci*COL_GAP)+"px;top:36px;width:"+NODE_W+"px;background:"+color;graphCanvas.appendChild(line);
  });
  visible.forEach(function(n){
    var pos=positions[n.id];if(!pos)return;
    var color=COLORS[n.cat]||"#94a3b8",el=document.createElement("div");el.className="node";
    if(selectedNode===n.id)el.classList.add("selected");
    if(connectedSet&&!connectedSet.has(n.id))el.classList.add("dimmed");
    el.style.cssText="left:"+pos.x+"px;top:"+pos.y+"px;background:"+color+(isDark?"14":"10")+";border-color:"+(selectedNode===n.id?color:color+(isDark?"33":"30"))+";color:var(--text)";
    var dot=document.createElement("div");dot.className="dot";dot.style.background=color;el.appendChild(dot);
    var lbl=document.createElement("div");lbl.className="lbl";lbl.textContent=n.label;lbl.title=n.path;el.appendChild(lbl);
    el.addEventListener("click",function(e){e.stopPropagation();selectedNode=n.id;buildDetail(n);render();});
    graphCanvas.appendChild(el);
  });
  var maxX=0,maxY=0;
  Object.values(positions).forEach(function(p){if(p.x+NODE_W>maxX)maxX=p.x+NODE_W;if(p.y+NODE_H>maxY)maxY=p.y+NODE_H;});
  maxX+=PAD_X+40;maxY+=PAD_Y+40;
  graphCanvas.style.width=maxX+"px";graphCanvas.style.height=maxY+"px";
  graphCanvas.style.transform="scale("+zoom+")";graphCanvas.style.transformOrigin="0 0";
  var canvas=document.getElementById("edgeCanvas"),dpr=window.devicePixelRatio||1;
  canvas.width=maxX*zoom*dpr;canvas.height=maxY*zoom*dpr;
  canvas.style.width=maxX*zoom+"px";canvas.style.height=maxY*zoom+"px";
  var ctx=canvas.getContext("2d");ctx.scale(dpr*zoom,dpr*zoom);ctx.clearRect(0,0,maxX,maxY);
  var edgeColor=isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)";
  var edgeDim=isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)";
  var edgeHl=isDark?"rgba(243,112,41,0.55)":"rgba(234,88,12,0.5)";
  EDGES.forEach(function(e){
    var s=positions[e.source],t=positions[e.target];if(!s||!t)return;
    var hl=selectedNode&&(e.source===selectedNode||e.target===selectedNode);
    if(connectedSet&&!hl){ctx.strokeStyle=edgeDim;ctx.lineWidth=1;}
    else if(hl){ctx.strokeStyle=edgeHl;ctx.lineWidth=2.5;}
    else{ctx.strokeStyle=edgeColor;ctx.lineWidth=1.2;}
    var sx=s.x+NODE_W/2,sy=s.y+NODE_H/2,tx=t.x+NODE_W/2,ty=t.y+NODE_H/2,dx=tx-sx;
    ctx.beginPath();ctx.moveTo(sx,sy);ctx.bezierCurveTo(sx+dx*0.4,sy,sx+dx*0.6,ty,tx,ty);ctx.stroke();
  });
}
document.getElementById("graphPanel").addEventListener("click",function(e){
  if(e.target===document.getElementById("graphPanel")||e.target===document.getElementById("edgeCanvas")){
    selectedNode=null;document.getElementById("detailPanel").classList.remove("open");render();
  }
});
render();
`;
}

// ── Entity view ───────────────────────────────────────────────

/** Entity view builder — renders entity cards in a grid. */
export function buildScriptEntityView(): string {
  return `
function renderEntityView(){
  var panel=document.getElementById("entitiesPanel");
  if(!ENTITIES||!ENTITIES.length){
    panel.innerHTML='<div class="ep-header">No entities detected. Run build_or_update_graph with full_rebuild=true.</div>';
    return;
  }
  var html='<div class="ep-header">'+ENTITIES.length+' domain entities detected</div><div class="ep-grid">';
  ENTITIES.forEach(function(e){
    var roles=Object.keys(e.roles||{}).map(function(r){
      return '<span class="ep-role">'+r+' '+e.roles[r]+'</span>';
    }).join("");
    var sel=selectedEntity===e.name?" selected":"";
    html+='<div class="ep-card'+sel+'" data-entity="'+e.name+'">'
      +'<div class="ep-card-header"><span class="ep-card-name">'+e.displayName+'</span>'
      +'<span class="ep-card-source '+e.source+'">'+e.source+'</span></div>'
      +'<div class="ep-card-count">'+e.memberCount+' files across '+Object.keys(e.roles||{}).length+' roles</div>'
      +'<div class="ep-roles">'+roles+'</div></div>';
  });
  html+='</div>';
  panel.innerHTML=html;
  panel.querySelectorAll(".ep-card").forEach(function(card){
    card.addEventListener("click",function(){
      var name=card.getAttribute("data-entity");
      if(selectedEntity===name){selectedEntity=null;}
      else{selectedEntity=name;}
      // Highlight entity members in tree by filtering
      if(selectedEntity){
        var ent=ENTITIES.find(function(e){return e.name===selectedEntity;});
        if(ent){entityMemberSet=new Set(ent.memberIds);}
      }else{entityMemberSet=null;}
      renderEntityView();
    });
  });
}
`;
}

// ── Script orchestrator ───────────────────────────────────────

/** Concatenates all JS sections into the final inline script. */
export function buildScript(nodes: VisNode[], catsPresent: string[], entities: VisEntity[]): string {
  return [
    buildScriptData(nodes, catsPresent, entities),
    buildScriptControls(),
    buildScriptGraphLogic(),
    buildScriptDetailPanel(),
    buildScriptTreeView(),
    buildScriptEntityView(),
    buildScriptRender(),
  ].join("\n");
}
