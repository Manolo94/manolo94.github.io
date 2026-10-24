// Map regions: groups of levels that collapse into one shape when zoomed out far enough.
//
// A region is {id, name, color} in grid.regions, and each level names its region in level.region.
// Collapsing is only a view: movement, gates, Check world and Calculate path always work on the levels.

const REGION_COLLAPSE_START = 14; // pixels per cell where regions start fading in over their levels
const REGION_COLLAPSE_FULL = 8;   // pixels per cell where only the regions show
const REGION_PALETTE = ["#6f86a8", "#5f9e4f", "#a8a050", "#4f6fb0", "#d47fb8", "#8e7cb0", "#5f8f80", "#c8a070"];

// 0 when levels show normally, 1 when regions fully cover them
function regionCollapseAmount()
{
  if(grid.regions.length == 0) return 0;
  return constrain((REGION_COLLAPSE_START - grid.gridSize) / (REGION_COLLAPSE_START - REGION_COLLAPSE_FULL), 0, 1);
}

// Collapsed enough that clicks go to regions instead of levels
function regionsCollapsed() { return regionCollapseAmount() >= 0.5; }

function regionById(id) { return grid.regions.find((r) => r.id === id); }

// ---------------------------------------------------------------------------------------------
// Shapes: which cells each region covers, its outline, label spot and the doors between regions.
//  Rebuilt only when levels, doors or regions change.

let regionShapeCache = null;

function regionShapeSignature()
{
  let parts = [JSON.stringify(grid.regions)];
  grid.levels.forEach((l) => parts.push(l.region + ":" + l.pos.x + "," + l.pos.y + "," + l.size.x + "," + l.size.y + "," + JSON.stringify(l.wallBreaks)));
  return parts.join("|");
}

function regionShapes()
{
  if(grid.regions.length == 0) return null;
  let signature = regionShapeSignature();
  if(regionShapeCache != null && regionShapeCache.signature === signature) return regionShapeCache;

  // Cell -> region id, using the same "first level containing the cell" rule as movement
  let regionAt = new Map();
  grid.levels.forEach((level) =>
  {
    for(let x = level.pos.x; x < level.pos.x + level.size.x; x++)
      for(let y = level.pos.y; y < level.pos.y + level.size.y; y++)
      {
        let key = x + "," + y;
        if(!regionAt.has(key)) regionAt.set(key, level.region);
      }
  });

  let shapes = new Map();
  grid.regions.forEach((r) => shapes.set(r.id, { region: r, cells: [], edges: [], minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }));
  regionAt.forEach((id, key) =>
  {
    let shape = shapes.get(id);
    if(shape === undefined) return;
    let [x, y] = key.split(",").map(Number);
    shape.cells.push([x, y]);
    shape.minX = Math.min(shape.minX, x); shape.maxX = Math.max(shape.maxX, x + 1);
    shape.minY = Math.min(shape.minY, y); shape.maxY = Math.max(shape.maxY, y + 1);
    // Outline: every cell side whose neighbor is not in the same region
    [[-1, 0, x, y, x, y + 1], [1, 0, x + 1, y, x + 1, y + 1], [0, -1, x, y, x + 1, y], [0, 1, x, y + 1, x + 1, y + 1]]
      .forEach(([dx, dy, x1, y1, x2, y2]) => { if(regionAt.get((x + dx) + "," + (y + dy)) !== id) shape.edges.push([x1, y1, x2, y2]); });
  });

  // Label spot: the region's cell closest to its center, so the name sits inside even odd shapes
  shapes.forEach((shape) =>
  {
    if(shape.cells.length == 0) return;
    let cx = shape.cells.reduce((a, c) => a + c[0], 0) / shape.cells.length;
    let cy = shape.cells.reduce((a, c) => a + c[1], 0) / shape.cells.length;
    let best = shape.cells.reduce((b, c) => Math.hypot(c[0] - cx, c[1] - cy) < Math.hypot(b[0] - cx, b[1] - cy) ? c : b);
    shape.label = [best[0] + 0.5, best[1] + 0.5];
  });

  // Doors between regions, from the compiled movement graph
  let doors = [];
  let g = WorldGraph.build(grid);
  for(let c = 0; c < g.cellX.length; c++)
    g.neighbors[c].forEach((d) =>
    {
      if(d < c) return;
      let a = g.cellLevel[c].region, b = g.cellLevel[d].region;
      if(a !== b) doors.push([(g.cellX[c] + g.cellX[d]) / 2 + 0.5, (g.cellY[c] + g.cellY[d]) / 2 + 0.5]);
    });

  regionShapeCache = { signature, shapes, regionAt, doors };
  return regionShapeCache;
}

function regionUnderMouse()
{
  let cache = regionShapes();
  if(cache == null) return null;
  let p = grid.screenPositionToGridPosition(createVector(mouseX, mouseY));
  let id = cache.regionAt.get(Math.floor(p.x) + "," + Math.floor(p.y));
  return id ? regionById(id) : null;
}

// ---------------------------------------------------------------------------------------------
// Drawing

function drawRegionsOverlay()
{
  let t = regionCollapseAmount();
  if(t == 0) return;
  let cache = regionShapes();
  if(cache == null) return;
  let s = grid.gridSize;
  let hovered = regionsCollapsed() && mouseX >= 0 && mouseY >= 0 && mouseX < width && mouseY < height ? regionUnderMouse() : null;

  cache.shapes.forEach((shape) =>
  {
    if(shape.cells.length == 0) return;
    let c = color(shape.region.color);
    c.setAlpha(255 * t);
    noStroke();
    fill(c);
    shape.cells.forEach(([x, y]) =>
    {
      let p = grid.getScreenPosFromGridPos(createVector(x, y));
      rect(p.x, p.y, s + 0.5, s + 0.5);   // + 0.5 hides seams between cells
    });
    stroke(20, 24, 30, 230 * t);
    strokeWeight(hovered === shape.region ? 3 : 1.5);
    if(hovered === shape.region) stroke(232, 163, 61, 255 * t);
    shape.edges.forEach(([x1, y1, x2, y2]) =>
    {
      let a = grid.getScreenPosFromGridPos(createVector(x1, y1)), b = grid.getScreenPosFromGridPos(createVector(x2, y2));
      line(a.x, a.y, b.x, b.y);
    });
  });

  // Doors between regions: small light marks on the borders
  noStroke();
  fill(255, 255, 255, 220 * t);
  cache.doors.forEach(([x, y]) =>
  {
    let p = grid.getScreenPosFromGridPos(createVector(x, y));
    circle(p.x, p.y, Math.max(3, s * 0.6));
  });

  // Names
  textAlign(CENTER, CENTER);
  cache.shapes.forEach((shape) =>
  {
    if(shape.cells.length == 0) return;
    let p = grid.getScreenPosFromGridPos(createVector(shape.label[0], shape.label[1]));
    let size = constrain(Math.sqrt(shape.cells.length) * s * 0.35, 11, 20);
    textSize(size);
    textStyle(BOLD);
    let w = textWidth(shape.region.name);
    fill(255, 255, 255, 200 * t);
    rect(p.x - w / 2 - 4, p.y - size / 2 - 2, w + 8, size + 4, 3);
    fill(20, 24, 30, 255 * t);
    text(shape.region.name, p.x, p.y);
    textStyle(NORMAL);
  });
}

// ---------------------------------------------------------------------------------------------
// Click a collapsed region to zoom into it (eased over a few frames)

let zoomTarget = null; // {gridSize, origin}

function zoomToRegion(region)
{
  let cache = regionShapes();
  let shape = cache && cache.shapes.get(region.id);
  if(!shape || shape.cells.length == 0) return;
  let bw = shape.maxX - shape.minX + 2, bh = shape.maxY - shape.minY + 2;
  let size = Math.min(width / bw, height / bh, width / 5);
  size = Math.max(size, REGION_COLLAPSE_START + 2);   // far enough in that the levels show
  let cx = (shape.minX + shape.maxX) / 2, cy = (shape.minY + shape.maxY) / 2;
  zoomTarget = { gridSize: size, origin: createVector(width / 2 - cx * size, height / 2 - cy * size) };
}

function updateZoomAnimation()
{
  if(zoomTarget == null) return;
  let k = 0.2;
  grid.gridSize += (zoomTarget.gridSize - grid.gridSize) * k;
  grid.gridOriginInScreen.x += (zoomTarget.origin.x - grid.gridOriginInScreen.x) * k;
  grid.gridOriginInScreen.y += (zoomTarget.origin.y - grid.gridOriginInScreen.y) * k;
  if(Math.abs(zoomTarget.gridSize - grid.gridSize) < 0.05 && Math.abs(zoomTarget.origin.x - grid.gridOriginInScreen.x) < 0.5)
  {
    grid.gridSize = zoomTarget.gridSize;
    grid.gridOriginInScreen = zoomTarget.origin;
    zoomTarget = null;
  }
}

// Called from mousePressed: returns true when the click was used by a collapsed region
function handleRegionClick()
{
  if(!regionsCollapsed()) return false;
  let region = regionUnderMouse();
  if(region == null) return false;
  zoomToRegion(region);
  return true;
}

// ---------------------------------------------------------------------------------------------
// Region list in the tool rail, the region field of the selected level, and the Paint regions tool

let activeRegionId = null;   // region the Paint regions tool assigns
let regionListSignature = "";

function generateRegionId()
{
  let n = 1;
  while(grid.regions.some((r) => r.id === "region_" + n)) n++;
  return "region_" + n;
}

function addRegion()
{
  let id = generateRegionId();
  let region = { id, name: "Region " + id.split("_")[1], color: REGION_PALETTE[grid.regions.length % REGION_PALETTE.length] };
  grid.regions.push(region);
  activeRegionId = id;
  if(grid.inspectedLevel != null && !grid.inspectedLevel.region) grid.inspectedLevel.region = id;
  renderRegionList(true);
}

function deleteRegion(id)
{
  grid.regions = grid.regions.filter((r) => r.id !== id);
  grid.levels.forEach((l) => { if(l.region === id) l.region = ""; });
  if(activeRegionId === id) activeRegionId = null;
  renderRegionList(true);
}

function setupRegions()
{
  document.querySelector("#AddRegionBtn").addEventListener("click", addRegion);
  document.querySelector("#LevelRegionSelect").addEventListener("change", (e) =>
  {
    if(grid.inspectedLevel != null) grid.inspectedLevel.region = e.target.value;
    renderRegionList(true);
  });
}

// Rebuild the list when regions or level counts change (checked a few times a second)
function renderRegionList(force)
{
  let counts = new Map();
  grid.levels.forEach((l) => { if(l.region) counts.set(l.region, (counts.get(l.region) || 0) + 1); });
  let signature = JSON.stringify(grid.regions) + JSON.stringify([...counts]) + activeRegionId;
  if(!force && signature === regionListSignature) return;
  regionListSignature = signature;

  let list = document.querySelector("#RegionList");
  list.replaceChildren();
  if(grid.regions.length == 0)
  {
    let p = document.createElement("p");
    p.className = "hint";
    p.textContent = "No regions yet.";
    list.append(p);
  }
  grid.regions.forEach((r) =>
  {
    let row = document.createElement("div");
    row.className = "region-row";
    let pick = document.createElement("input");
    pick.type = "radio"; pick.name = "activeRegion"; pick.checked = r.id === activeRegionId;
    pick.setAttribute("aria-label", "Paint with " + r.name);
    pick.addEventListener("change", () => { activeRegionId = r.id; });
    let swatch = document.createElement("input");
    swatch.type = "color"; swatch.value = r.color;
    swatch.setAttribute("aria-label", r.name + " color");
    swatch.addEventListener("input", () => { r.color = swatch.value; });
    let name = document.createElement("input");
    name.type = "text"; name.value = r.name;
    name.setAttribute("aria-label", "Region name");
    name.addEventListener("input", () => { r.name = name.value; regionListSignature = ""; });
    let count = document.createElement("span");
    count.className = "count";
    count.textContent = counts.get(r.id) || 0;
    count.title = "levels in this region";
    let remove = document.createElement("button");
    remove.className = "remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Delete region " + r.name);
    remove.addEventListener("click", () => deleteRegion(r.id));
    row.append(pick, swatch, name, count, remove);
    list.append(row);
  });

  // Region choices for the selected level
  let select = document.querySelector("#LevelRegionSelect");
  let current = grid.inspectedLevel ? grid.inspectedLevel.region : "";
  select.replaceChildren();
  [["", "None"]].concat(grid.regions.map((r) => [r.id, r.name])).forEach(([value, label]) =>
  {
    let option = document.createElement("option");
    option.value = value; option.textContent = label;
    select.append(option);
  });
  select.value = current;
}

function refreshRegionInspector()
{
  let select = document.querySelector("#LevelRegionSelect");
  select.disabled = grid.inspectedLevel == null;
  let value = grid.inspectedLevel ? grid.inspectedLevel.region : "";
  if(select.value !== value) select.value = value;
}

// Paint regions tool: clicking a level puts it in the active region (clicking again takes it out)
function paintRegion(level)
{
  if(activeRegionId == null || !regionById(activeRegionId))
  {
    showWorldFileMessage("Pick a region in the Regions list first", true);
    return;
  }
  level.region = level.region === activeRegionId ? "" : activeRegionId;
  renderRegionList(true);
}

// ---------------------------------------------------------------------------------------------
// Check world: one line per region

function analyzeRegions(r)
{
  let g = r.graph;
  let byRegion = new Map(grid.regions.map((reg) => [reg.id, { region: reg, cells: 0, reachable: 0, entry: null, all: new Set() }]));
  for(let c = 0; c < g.cellX.length; c++)
  {
    let info = byRegion.get(g.cellLevel[c].region);
    if(!info) continue;
    info.cells++;
    if(!r.base.reach[c]) continue;
    info.reachable++;
    let req = WorldCheck.requiresOf(r, c);
    req.forEach((j) => info.all.add(j));
    // Entry: what every route into the region needs = what its easiest cell needs
    if(info.entry == null || req.length < info.entry.length) info.entry = req;
  }
  return [...byRegion.values()].filter((i) => i.cells > 0);
}
