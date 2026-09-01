const V = 15;
const INF = 99999;
let baseGraph = Array(V).fill(null).map(() => Array(V).fill(INF));
let activeGraph = Array(V).fill(null).map(() => Array(V).fill(INF));

for (let i = 0; i < V; i++) { baseGraph[i][i] = 0; activeGraph[i][i] = 0; }

function addEdge(u, v, weight) {
    baseGraph[u][v] = weight; baseGraph[v][u] = weight;
    activeGraph[u][v] = weight; activeGraph[v][u] = weight;
}

addEdge(0, 1, 8); addEdge(0, 3, 12); addEdge(0, 2, 15); addEdge(1, 3, 5); addEdge(1, 5, 14); 
addEdge(2, 3, 6); addEdge(2, 6, 20); addEdge(3, 7, 10); addEdge(4, 3, 8); addEdge(4, 7, 7); 
addEdge(4, 9, 11); addEdge(5, 8, 9); addEdge(5, 7, 16); addEdge(6, 4, 12); addEdge(6, 11, 22); 
addEdge(7, 8, 4); addEdge(7, 12, 18); addEdge(7, 9, 6); addEdge(8, 10, 15); addEdge(8, 12, 10); 
addEdge(9, 12, 8); addEdge(9, 11, 14); addEdge(10, 13, 9); addEdge(11, 14, 12); addEdge(12, 13, 11); 
addEdge(12, 14, 13); addEdge(13, 14, 7);

const locations = [
    { id: 0, name: "Shatabdi Hosp", x: 75, y: 300, type: "hospital" },
    { id: 1, name: "DMart", x: 225, y: 125, type: "standard" },
    { id: 2, name: "Deonar Depot", x: 225, y: 475, type: "standard" },
    { id: 3, name: "SAKEC", x: 275, y: 300, type: "standard" },
    { id: 4, name: "Tilak Nagar", x: 375, y: 425, type: "standard" },
    { id: 5, name: "Chembur Camp", x: 425, y: 75, type: "standard" },
    { id: 6, name: "Amarmahal", x: 425, y: 575, type: "standard" },
    { id: 7, name: "Govandi Stn", x: 475, y: 255, type: "standard" },
    { id: 8, name: "Chembur Stn", x: 575, y: 125, type: "standard" },
    { id: 9, name: "Diamond Gdn", x: 575, y: 395, type: "standard" },
    { id: 10, name: "RK Studios", x: 725, y: 75, type: "standard" },
    { id: 11, name: "Mankhurd", x: 725, y: 525, type: "standard" },
    { id: 12, name: "K-Star Mall", x: 725, y: 275, type: "standard" },
    { id: 13, name: "Trombay", x: 825, y: 175, type: "standard" },
    { id: 14, name: "BARC Gate", x: 825, y: 425, type: "standard" }
];

const container = document.getElementById("mapContainer");
const canvas = document.getElementById("roadCanvas");
const ctx = canvas.getContext("2d");
let blockedRoads = []; 
let glowPhase = 0;
let pendingRequests = []; // THE NEW HOLDING QUEUE

let fleet = [
    { id: 1, active: false, state: 'idle', x: locations[0].x, y: locations[0].y, angle: 0, targetNode: null, priority: null, pathSequence: [], fullPathPairs: [], distance: 0 },
    { id: 2, active: false, state: 'idle', x: locations[0].x, y: locations[0].y, angle: 0, targetNode: null, priority: null, pathSequence: [], fullPathPairs: [], distance: 0 },
    { id: 3, active: false, state: 'idle', x: locations[0].x, y: locations[0].y, angle: 0, targetNode: null, priority: null, pathSequence: [], fullPathPairs: [], distance: 0 }
];

function runDijkstra(src, dest) {
    let dist = new Array(V).fill(INF);
    let visited = new Array(V).fill(false);
    let parent = new Array(V).fill(-1);
    dist[src] = 0;

    for (let count = 0; count < V - 1; count++) {
        let u = -1, min = INF;
        for (let v = 0; v < V; v++) {
            if (!visited[v] && dist[v] <= min) { min = dist[v]; u = v; }
        }
        if (u === -1 || u === dest) break;
        visited[u] = true;

        for (let v = 0; v < V; v++) {
            if (!visited[v] && activeGraph[u][v] !== INF && dist[u] + activeGraph[u][v] < dist[v]) {
                dist[v] = dist[u] + activeGraph[u][v];
                parent[v] = u;
            }
        }
    }
    
    if (dist[dest] === INF) return { path: [], nodes: [], dist: INF };
    
    let pathPairs = [];
    let nodes = [];
    let curr = dest;
    while (curr !== src && parent[curr] !== -1) {
        pathPairs.push([curr, parent[curr]]);
        nodes.push(curr);
        curr = parent[curr];
    }
    nodes.push(src);
    return { path: pathPairs, nodes: nodes.reverse(), dist: dist[dest] };
}

function initUI() {
    let uSelect = document.getElementById("block-u");
    let vSelect = document.getElementById("block-v");

    locations.forEach(loc => {
        let el = document.createElement("div");
        el.className = `node-marker node-${loc.type}`;
        el.id = `node-${loc.id}`;
        el.style.left = ((loc.x / 900) * 100) + "%";
        el.style.top = ((loc.y / 650) * 100) + "%";
        el.innerHTML = `<div class="node-box">${loc.name}</div>`;
        if (loc.id !== 0) el.onclick = () => handleDispatchClick(loc.id);
        container.appendChild(el);

        let optionHTML = `<option value="${loc.id}">${loc.name}</option>`;
        uSelect.innerHTML += optionHTML;
        vSelect.innerHTML += optionHTML;
    });
    requestAnimationFrame(animationLoop);
}

function handleDispatchClick(destId) {
    // Ignore if ambulance is already on the way OR if it's already in the waiting queue
    if (fleet.some(a => a.active && a.targetNode === destId && (a.state === 'en_route' || a.state === 'treating'))) return;
    if (pendingRequests.some(r => r.dest === destId)) return;
    
    let priority = parseInt(document.getElementById("priority-select").value);
    document.getElementById(`node-${destId}`).classList.add("node-emergency");

    if (priority === 1) { 
        let hijackedAmb = fleet.find(a => a.active && a.state === 'en_route' && a.priority === 2);
        
        if (hijackedAmb) {
            let oldTarget = hijackedAmb.targetNode;
            hijackedAmb.priority = 1;
            hijackedAmb.targetNode = destId;
            
            let nextNodeId = hijackedAmb.pathSequence[0]; 
            let result = runDijkstra(nextNodeId, destId);
            
            if (result.nodes.length > 0) {
                hijackedAmb.pathSequence = result.nodes;
                hijackedAmb.fullPathPairs = result.path; 
                hijackedAmb.distance = result.dist;
            }
            
            // Push the abandoned patient safely back into the system queue
            addRequestToSystem(oldTarget, 2);
            updateUI();
            return;
        }
    }
    
    addRequestToSystem(destId, priority);
    updateUI();
}

// INTELLIGENT ROUTER: Either deploys immediately, or puts in holding queue
function addRequestToSystem(destId, priority) {
    let availableAmb = fleet.find(a => !a.active);
    
    if (availableAmb) {
        let result = runDijkstra(0, destId);
        if (result.nodes.length <= 1) { 
            alert("Path blocked!"); 
            document.getElementById(`node-${destId}`).classList.remove("node-emergency");
            return; 
        }
        
        result.nodes.shift(); 
        availableAmb.active = true;
        availableAmb.state = 'en_route';
        availableAmb.targetNode = destId;
        availableAmb.priority = priority;
        availableAmb.pathSequence = result.nodes;
        availableAmb.fullPathPairs = result.path;
        availableAmb.distance = result.dist;
    } else {
        // If 3 ambulances are out, place in holding queue and sort by priority!
        pendingRequests.push({ dest: destId, priority: priority });
        pendingRequests.sort((a, b) => a.priority - b.priority);
    }
}

function animationLoop() {
    glowPhase += 0.05;
    
    fleet.forEach(amb => {
        if (amb.active && amb.pathSequence.length > 0) {
            let targetLoc = locations[amb.pathSequence[0]];
            let dx = targetLoc.x - amb.x;
            let dy = targetLoc.y - amb.y;
            let distance = Math.sqrt(dx*dx + dy*dy);
            let speed = 0.6; 
            
            amb.angle = Math.atan2(dy, dx);
            
            if (distance <= speed) {
                amb.x = targetLoc.x;
                amb.y = targetLoc.y;
                amb.pathSequence.shift(); 
                
                if (amb.pathSequence.length === 0) {
                    if (amb.state === 'en_route') {
                        amb.state = 'treating';
                        amb.fullPathPairs = []; 
                        document.getElementById(`node-${amb.targetNode}`).classList.remove("node-emergency");
                        updateUI();
                        
                        setTimeout(() => {
                            if(amb.state !== 'treating') return; 
                            amb.state = 'returning';
                            amb.priority = null;
                            let result = runDijkstra(amb.targetNode, 0);
                            result.nodes.shift();
                            amb.pathSequence = result.nodes;
                            amb.fullPathPairs = result.path;
                            updateUI();
                        }, 1000); 
                        
                    } else if (amb.state === 'returning') {
                        amb.active = false;
                        amb.state = 'idle';
                        amb.fullPathPairs = [];
                        
                        // AUTO-DEPLOY FROM QUEUE: The moment it hits Base, check if patients are waiting
                        if (pendingRequests.length > 0) {
                            let nextReq = pendingRequests.shift();
                            addRequestToSystem(nextReq.dest, nextReq.priority);
                        }
                        updateUI();
                    }
                }
            } else {
                amb.x += (dx / distance) * speed;
                amb.y += (dy / distance) * speed;
            }
        }
    });

    renderCanvas();
    requestAnimationFrame(animationLoop);
}

function renderCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < V; i++) {
        for (let j = i + 1; j < V; j++) {
            if (baseGraph[i][j] !== INF) {
                let isBlocked = blockedRoads.some(r => (r[0]===i && r[1]===j) || (r[0]===j && r[1]===i));
                ctx.beginPath();
                ctx.moveTo(locations[i].x, locations[i].y);
                ctx.lineTo(locations[j].x, locations[j].y);
                
                if (isBlocked) {
                    ctx.strokeStyle = "#e74c3c"; ctx.lineWidth = 6; ctx.setLineDash([10, 10]);
                } else {
                    ctx.strokeStyle = "#3a3a4a"; ctx.lineWidth = 6; ctx.setLineDash([]);
                }
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }

    fleet.forEach(amb => {
        if (amb.active && amb.fullPathPairs.length > 0) {
            let colors = (amb.priority === 1) ? { base: "#8b0000", glow: "#e74c3c" } : { base: "#005555", glow: "#00e5ff" };
            if (amb.state === 'returning') colors = { base: "#8b750a", glow: "#f1c40f" };

            amb.fullPathPairs.forEach(p => {
                ctx.beginPath(); ctx.moveTo(locations[p[0]].x, locations[p[0]].y); ctx.lineTo(locations[p[1]].x, locations[p[1]].y);
                ctx.strokeStyle = colors.base; ctx.lineWidth = 10; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(locations[p[0]].x, locations[p[0]].y); ctx.lineTo(locations[p[1]].x, locations[p[1]].y);
                ctx.strokeStyle = colors.glow; ctx.lineWidth = 4;
                ctx.shadowColor = colors.glow; ctx.shadowBlur = 10 + Math.sin(glowPhase) * 5; ctx.stroke();
                ctx.shadowBlur = 0; 
            });
        }
    });

    for (let i = 0; i < V; i++) {
        for (let j = i + 1; j < V; j++) {
            if (baseGraph[i][j] !== INF) {
                let isBlocked = blockedRoads.some(r => (r[0]===i && r[1]===j) || (r[0]===j && r[1]===i));
                let midX = (locations[i].x + locations[j].x) / 2;
                let midY = (locations[i].y + locations[j].y) / 2;
                
                ctx.font = "8px 'Press Start 2P'"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.strokeStyle = "#111111"; ctx.lineWidth = 3;
                let text = isBlocked ? "X" : baseGraph[i][j];
                
                ctx.strokeText(text, midX, midY - 8);
                ctx.fillStyle = isBlocked ? "#e74c3c" : "#a0a0b0";
                ctx.fillText(text, midX, midY - 8);
            }
        }
    }

    fleet.forEach(amb => {
        if (amb.active) drawAmbulance(amb.x, amb.y, amb.angle, amb.priority, amb.state);
    });
}

function drawAmbulance(x, y, angle, priority, state) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle); 

    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(-12, -7, 24, 14);
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = "#2c3e50"; ctx.fillRect(4, -6, 5, 12);
    ctx.fillStyle = "#e74c3c"; ctx.fillRect(-4, -2, 8, 4); ctx.fillRect(-2, -4, 4, 8);

    let time = Date.now();
    let isRedFlash = (time % 400) > 200;

    ctx.fillStyle = isRedFlash ? "#ff0000" : "#440000"; ctx.fillRect(10, -7, 2, 3);
    if (isRedFlash) { ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 10; ctx.fillRect(10, -7, 2, 3); ctx.shadowBlur = 0; }

    ctx.fillStyle = !isRedFlash ? "#0088ff" : "#000044"; ctx.fillRect(10, 4, 2, 3);
    if (!isRedFlash) { ctx.shadowColor = "#0088ff"; ctx.shadowBlur = 10; ctx.fillRect(10, 4, 2, 3); ctx.shadowBlur = 0; }
    
    ctx.restore();
}

function executeBlockRoad() {
    let uVal = document.getElementById("block-u").value;
    let vVal = document.getElementById("block-v").value;
    
    if (uVal === "none" || vVal === "none" || uVal === vVal) { alert("Please select two distinct locations."); return; }

    let u = parseInt(uVal);
    let v = parseInt(vVal);

    if (baseGraph[u][v] !== INF) {
        activeGraph[u][v] = INF; activeGraph[v][u] = INF; blockedRoads.push([u, v]);
    } else {
        let result = runDijkstra(u, v);
        let seq = result.nodes;
        for(let i=0; i<seq.length-1; i++) {
            let n1 = seq[i], n2 = seq[i+1];
            activeGraph[n1][n2] = INF; activeGraph[n2][n1] = INF; blockedRoads.push([n1, n2]);
        }
    }
    
    fleet.forEach(amb => {
        if (amb.active && amb.pathSequence.length > 0) {
            let nextNode = amb.pathSequence[0];
            let dest = (amb.state === 'returning') ? 0 : amb.targetNode;
            let result = runDijkstra(nextNode, dest);
            if(result.nodes.length > 0) {
                amb.pathSequence = result.nodes;
                amb.fullPathPairs = result.path;
                amb.distance = result.dist;
            }
        }
    });
    updateUI();
}

function updateUI() {
    let html = "";
    let sortedFleet = [...fleet].filter(a => a.active).sort((a, b) => a.priority - b.priority);
    
    // Render Active Units
    sortedFleet.forEach(amb => {
        let pClass = amb.priority === 1 ? 'unit-p1' : (amb.priority === 2 ? 'unit-p2' : '');
        let destName = amb.state === 'returning' ? "Shatabdi Hosp" : locations[amb.targetNode].name;
        let statusText = amb.state === 'treating' ? "Triage (Wait)" : (amb.state === 'returning' ? "Returning" : "En Route");
        
        html += `<div class="unit-row ${pClass}">
                    <span style="color: #fff">AMB-${amb.id} | ${statusText}</span>
                    <span style="color: #aaa; margin-top: 3px;">Target: ${destName}</span>
                 </div>`;
    });

    // Render Holding Queue underneath active units
    pendingRequests.forEach((req, idx) => {
        let pClass = req.priority === 1 ? 'unit-p1' : (req.priority === 2 ? 'unit-p2' : '');
        let destName = locations[req.dest].name;
        html += `<div class="unit-row unit-pending ${pClass}">
                    <span style="color: #fff">HOLDING | Queue #${idx + 1}</span>
                    <span style="color: #aaa; margin-top: 3px;">Target: ${destName} (P${req.priority})</span>
                 </div>`;
    });

    document.getElementById("active-units-list").innerHTML = html || '<span class="text-green">All units idle at Base.</span>';
}

function resetSystem() {
    fleet.forEach(a => {
        a.active = false; a.state = 'idle'; 
        a.x = locations[0].x; a.y = locations[0].y; 
        a.targetNode = null; a.pathSequence = []; a.fullPathPairs = [];
    });
    
    for(let i=1; i<V; i++) document.getElementById(`node-${i}`).classList.remove("node-emergency");
    
    blockedRoads = [];
    pendingRequests = []; // CLEAR THE HOLDING QUEUE ON RESET
    
    for (let i=0; i<V; i++) for (let j=0; j<V; j++) activeGraph[i][j] = baseGraph[i][j];
    
    document.getElementById("block-u").value = "none"; 
    document.getElementById("block-v").value = "none";
    updateUI();
}

initUI();