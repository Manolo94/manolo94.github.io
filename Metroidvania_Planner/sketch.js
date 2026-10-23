let canvasMouseDown = false; // true only while a press that started on the canvas is held

function setup() {
  createCanvas(1000, 1000).parent("CanvasArea");
  
  grid = new GridState();
  
  loadWorld();
  
  setupLevelInspector();
  setupWorldUpload();
  setupWorldCheck();
  
  // Save world automatically every 20 seconds
  var intervalId = window.setInterval(function(){
    saveWorld();
  }, 20000);
}

function update()
{
  // LEVEL CONTROLS
  grid.inRegularMode = document.querySelector("#RegularModeRadioBtn").checked;
  grid.nowAddingDoors = document.querySelector("#AddDoorsRadioBtn").checked;
  grid.nowAddingWalls = document.querySelector("#AddWallsRadioBtn").checked;
  grid.nowAddingObjectives = document.querySelector("#AddObjectivesRadioBtn").checked;
  grid.nowRemovingObjectives = document.querySelector("#RemoveObjectivesRadioBtn").checked;
  grid.nowAddingObstaclesToALevel = document.querySelector("#AddObstacleRadioBtn").checked;
  grid.nowRemovingObstaclesFromALevel = document.querySelector("#RemoveObstacleRadioBtn").checked;
  
  // GLOBAL CONTROLS
  grid.nowSettingStartPosition = document.querySelector("#SetStartPositionCheck").checked;
  grid.nowSettingEndPosition = document.querySelector("#SetEndPositionCheck").checked;
  
  // Drag level around if one is selected
  if(grid.selectedLevel != null)
  {
    if(grid.nowTranslatingALevel)
    {
      let gridVector = grid.screenVectorToGridVector(createVector(mouseX - pmouseX, mouseY - pmouseY));
      grid.selectedLevel.translateLevel(gridVector);
    }
    else if(grid.nowSizingALevel)
    {
      let mousePosInGrid = grid.screenPositionToGridPosition(createVector(mouseX, mouseY));
      grid.selectedLevel.adjustLevelSize(grid.sizingBorders, mousePosInGrid);
    }
  }
  // Pan around the grid
  else if(canvasMouseDown)
  {
    // Pan around the grid when nothing is selected and mouse is pressed
    grid.panGrid(mouseX - pmouseX, mouseY - pmouseY);
  }
  
  grid.hoveringOverLevel = null;
  grid.levels.forEach((level) =>
  {
    if(level.isMouseInLevel())
      grid.hoveringOverLevel = level;
  });
}

function saveWorld()
{  
  let gridSaveObjectJSON = JSON.stringify(grid.getGridStateSaveObject());
  
  console.log("Saving World... Size (roughly) " + (gridSaveObjectJSON.length*2) + " bytes");

  localStorage.setItem('GridSaveObjectJSON', gridSaveObjectJSON);
  
  document.getElementById("SavedMessage").hidden = false;
  setTimeout(function() { document.getElementById("SavedMessage").hidden = true; }, 3000);
}

function loadWorld()
{  
  let gridSaveObjectJSON = localStorage.getItem('GridSaveObjectJSON');
  
  if(gridSaveObjectJSON != null)
  {
    console.log("Loading World... Size (roughly) " + (gridSaveObjectJSON.length*2) + " bytes")
    grid.loadGridStateSaveObject(JSON.parse(gridSaveObjectJSON));
  }
  else
  {
    console.log("No World saved!")
  }
}

function clearWorldFirstTry()
{
  document.getElementById("ClearWorldConfirmSpan").hidden = false;
}

// Download the world as a .json file (the same object that Save World keeps in the browser)
function downloadWorld()
{
  let json = JSON.stringify(grid.getGridStateSaveObject(), null, 2);
  let blob = new Blob([json], { type: "application/json" });
  let link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "world.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showWorldFileMessage("Downloaded world.json", false);
}

// Upload: read and check the file first, then ask before replacing the current world
let pendingUploadedWorld = null;

function setupWorldUpload()
{
  let input = document.querySelector("#UploadWorldInput");
  input.addEventListener("change", () =>
  {
    let file = input.files[0];
    input.value = ""; // so choosing the same file again still triggers a change
    if(file === undefined) return;
    
    let reader = new FileReader();
    reader.onload = () =>
    {
      let world;
      try { world = JSON.parse(reader.result); }
      catch(e) { showWorldFileMessage("Could not read " + file.name + ": it is not valid JSON", true); return; }
      
      let problem = checkWorldSaveObject(world);
      if(problem) { showWorldFileMessage("Could not load " + file.name + ": " + problem, true); return; }
      
      pendingUploadedWorld = world;
      document.querySelector("#UploadWorldFileName").textContent = file.name;
      document.querySelector("#UploadWorldConfirmSpan").hidden = false;
      document.querySelector("#WorldFileMessage").hidden = true;
    };
    reader.onerror = () => showWorldFileMessage("Could not read " + file.name, true);
    reader.readAsText(file);
  });
}

// Returns a description of what is wrong with a world object, or null if it can be loaded
function checkWorldSaveObject(world)
{
  let isVec = (v) => v != null && typeof v.x === "number" && typeof v.y === "number";
  if(world == null || typeof world !== "object") return "the file does not contain a world";
  if(!Array.isArray(world.levels)) return "it has no levels list";
  if(!isVec(world.startPosition) || !isVec(world.endPosition)) return "the start or end position is missing";
  if(!isVec(world.gridOriginInScreen) || typeof world.gridSize !== "number") return "the view settings are missing";
  
  let ids = new Set();
  for(let i = 0; i < world.levels.length; i++)
  {
    let level = world.levels[i];
    if(level == null || !isVec(level.pos) || !isVec(level.size)) return "level " + (i + 1) + " has no position or size";
    if(!Array.isArray(level.wallBreaks) || level.wallBreaks.length !== 4) return "level " + (i + 1) + " has no wall breaks";
    if(!GridState.isWellFormedLevelId(level.id)) return "level " + (i + 1) + " has no valid id";
    if(ids.has(level.id)) return "two levels share the id " + level.id;
    ids.add(level.id);
  }
  return null;
}

function uploadWorldConfirm()
{
  document.querySelector("#UploadWorldConfirmSpan").hidden = true;
  if(pendingUploadedWorld == null) return;
  
  grid = new GridState();
  grid.loadGridStateSaveObject(pendingUploadedWorld);
  pendingUploadedWorld = null;
  closeCellPopup();
  refreshLevelInspector();
  saveWorld(); // keep it in the browser too, like any other edit
  showWorldFileMessage("World loaded from " + document.querySelector("#UploadWorldFileName").textContent, false);
}

function uploadWorldCancel()
{
  pendingUploadedWorld = null;
  document.querySelector("#UploadWorldConfirmSpan").hidden = true;
}

function showWorldFileMessage(text, isError)
{
  let message = document.querySelector("#WorldFileMessage");
  message.textContent = text;
  message.style.color = isError ? "firebrick" : "";
  message.hidden = false;
  clearTimeout(showWorldFileMessage.timer);
  if(!isError) showWorldFileMessage.timer = setTimeout(() => { message.hidden = true; }, 3000);
}

function clearWorldConfirm()
{
  console.log("Clearing World...");
  
  document.getElementById("ClearWorldConfirmSpan").hidden = true;
  
  localStorage.removeItem('GridSaveObjectJSON')
  grid = new GridState()
  refreshLevelInspector();
  closeCellPopup();
}

// Selected level fields: edit the id and name of the level last clicked
let inspectorShownLevel = undefined;

function setupLevelInspector()
{
  let idTxt = document.querySelector("#LevelIdTxt");
  let nameTxt = document.querySelector("#LevelNameTxt");
  let idError = document.querySelector("#LevelIdError");
  
  nameTxt.addEventListener("input", () =>
  {
    if(grid.inspectedLevel != null) grid.inspectedLevel.name = nameTxt.value;
  });
  
  let colorInput = document.querySelector("#LevelColorInput");
  colorInput.addEventListener("input", () =>
  {
    let level = grid.inspectedLevel;
    if(level == null) return;
    let c = color(colorInput.value);
    c.setAlpha(LEVEL_FILL_ALPHA);
    level.color = c;
  });
  
  idTxt.addEventListener("change", () =>
  {
    let level = grid.inspectedLevel;
    if(level == null) return;
    let newId = idTxt.value.trim().toLowerCase();
    
    if(!GridState.isWellFormedLevelId(newId))
      idError.textContent = "Use only lowercase letters, digits and _";
    else if(grid.isLevelIdTaken(newId, level))
      idError.textContent = "Another level already uses this id";
    else
    {
      level.id = newId;
      idError.textContent = "";
      idError.hidden = true;
      idTxt.value = newId;
      return;
    }
    idError.hidden = false;
    idTxt.value = level.id;
  });
  
  refreshLevelInspector();
}

// "#rrggbb" for an <input type="color">, ignoring alpha
function colorToHex(c)
{
  let hex2 = (v) => Math.round(v).toString(16).padStart(2, "0");
  return "#" + hex2(red(c)) + hex2(green(c)) + hex2(blue(c));
}

function refreshLevelInspector()
{
  let level = grid.inspectedLevel;
  if(level === inspectorShownLevel) return;
  inspectorShownLevel = level;
  
  let idTxt = document.querySelector("#LevelIdTxt");
  let nameTxt = document.querySelector("#LevelNameTxt");
  let colorInput = document.querySelector("#LevelColorInput");
  idTxt.disabled = nameTxt.disabled = colorInput.disabled = (level == null);
  idTxt.value = level != null ? level.id : "";
  nameTxt.value = level != null ? level.name : "";
  if(level != null) colorInput.value = colorToHex(level.color);
  document.querySelector("#LevelIdError").hidden = true;
}

function clearWorldCancel()
{
  document.getElementById("ClearWorldConfirmSpan").hidden = true;
}

function calculatePath()
{
  grid.setPathFromPathStack(GridSolver.GetPathFromTo(grid.startPosition, grid.endPosition, grid))
  
  let message = document.querySelector("#PathMessage");
  message.textContent = GridSolver.lastMessage;
  message.hidden = GridSolver.lastMessage == "";
}

function isCloseEnough(value1, value2)
{
  return Math.abs(value1 - value2) < 1e-4;
}

function draw() {
  update();
  refreshLevelInspector();
  
  background(220);
  grid.drawGrid();
  
  let mousePosInGrid = grid.screenPositionToGridPosition(createVector(mouseX, mouseY));
  
  grid.levels.forEach((level) =>
  {
    level.drawLevel();
  });
  
  refreshWorldCheck();
  drawWorldCheckOverlay();
  
  grid.drawStartAndEndPositions();
  
  grid.drawCurrentPath();
  
  // Show highlight if close to border
  if(grid.hoveringOverLevel != null && grid.nowSizingALevel == false && grid.inRegularMode)
  {
    let bordersToHighlight = grid.hoveringOverLevel.isCloseToEdge(mousePosInGrid);
    grid.hoveringOverLevel.drawHighlightBorder(bordersToHighlight, "lightblue");
  }
  
  // Show manipulated border if sizing level
  if(grid.nowSizingALevel && grid.selectedLevel != null)
  {
    grid.selectedLevel.drawHighlightBorder(grid.sizingBorders, "darkblue");
  }
}

function mousePressed(event)
{
  // Ignore clicks on the buttons and text fields above the canvas
  if(event && event.target && event.target.tagName !== "CANVAS") return;
  canvasMouseDown = true;
  
  grid.selectedLevel = null;
  grid.nowTranslatingALevel = false;
  grid.nowSizingALevel = false;
  
  let clickedLevel = null;
  grid.levels.forEach((level) =>
  {
    if(level.isMouseInLevel())
    {
      grid.selectedLevel = level;
      clickedLevel = level;
      
      if(grid.nowAddingDoors || grid.nowAddingWalls)
      {
        // Check where to put the door
        let mousePosInGrid = grid.screenPositionToGridPosition(createVector(mouseX, mouseY));
        let whichEdge = grid.selectedLevel.isCloseToEdge(mousePosInGrid);

        // Don't add a door or wall if the mouse is not close to any edges
        if(whichEdge.x != 0 || whichEdge.y != 0)
        {
          if(grid.nowAddingDoors) level.addWallBreak(mousePosInGrid);
          if(grid.nowAddingWalls) level.removeWallBreak(mousePosInGrid);
        }
      }
      else if(grid.nowAddingObjectives || grid.nowRemovingObjectives)
      {
        // Check where to put the objective
        let mousePosInGrid = grid.screenPositionToGridPosition(createVector(mouseX, mouseY));
        
        if(grid.nowAddingObjectives) level.addObjective(mousePosInGrid);
        else if(grid.nowRemovingObjectives) level.removeObjective(mousePosInGrid);
      }
      else if(grid.nowAddingObstaclesToALevel || grid.nowRemovingObstaclesFromALevel)
      {
        // Check where to put the objective or select an objective
        let mousePosInGrid = grid.screenPositionToGridPosition(createVector(mouseX, mouseY));

        let clickedObjective = level.selectObjective(mousePosInGrid);

        if(clickedObjective != null)
        {
          grid.selectedObjective = clickedObjective;
          document.querySelector("#SelectedObjectiveTxt").value = grid.selectedObjective.index;
        }
        else if(grid.selectedObjective != null)
        {
          // Add the obstacle unlocked by the selected level
          if(grid.nowAddingObstaclesToALevel && grid.selectedObjective != null)
          {
            level.addObstacle(mousePosInGrid, grid.selectedObjective);
          }
        }
        // Remove the obstacle
        if(grid.nowRemovingObstaclesFromALevel)
        {
          level.removeObstacle(mousePosInGrid);
        }
      }
      else if(grid.inRegularMode)
      {
        // Check if we are sizing instead of translating
        let mousePosInGrid = grid.screenPositionToGridPosition(createVector(mouseX, mouseY));
        grid.sizingBorders = grid.selectedLevel.isCloseToEdge(mousePosInGrid);

        // Translating if the mouse is not close to any borders, sizing otherwise
        if(grid.sizingBorders.x == 0 && grid.sizingBorders.y == 0)
        {
          grid.nowTranslatingALevel = true;
          grid.nowSizingALevel = false;
        }
        else
        {
          grid.nowTranslatingALevel = false;
          grid.nowSizingALevel = true;
        }
      }
    }
  });
  if(document.querySelector("#InspectRadioBtn").checked)
    inspectCellUnderMouse(event);
  
  // Clicking a level shows it in the Selected level fields; clicking empty space in Move and Size mode clears them
  if(clickedLevel != null) grid.inspectedLevel = clickedLevel;
  else if(grid.inRegularMode) grid.inspectedLevel = null;
  
  if(grid.nowSettingStartPosition)
  {
    // Check where to put the start position
    let mousePosInGrid = grid.screenPositionToGridPosition(createVector(mouseX, mouseY));
    grid.setStartPosition(mousePosInGrid);
    document.querySelector("#SetStartPositionCheck").checked = false;
  }
  else if(grid.nowSettingEndPosition)
  {
    // Check where to put the start position
    let mousePosInGrid = grid.screenPositionToGridPosition(createVector(mouseX, mouseY));
    grid.setEndPosition(mousePosInGrid);
    document.querySelector("#SetEndPositionCheck").checked = false;
  }
}

function mouseReleased()
{
  canvasMouseDown = false;
  if(grid.selectedLevel != null) grid.selectedLevel.snapLevelToGrid();
  
  grid.selectedLevel = null;
  grid.sizingBorders = createVector(0,0);
  grid.nowTranslatingALevel = false;
  grid.nowSizingALevel = false;
}

function addLevel()
{
  grid.addNewLevel();
}

function mouseWheel(event)
{
  grid.zoomGrid(event);
}
// ---------------------------------------------------------------------------------------------
// World check (Check World button, objective toggles, Inspect Cells mode). Analysis is in world_check.js.

let worldCheckOn = false;
let worldCheckResult = null;
let worldCheckSignature = "";
let worldCheckLastPoll = 0;
let inspectedCell = null; // {x, y} of the cell shown in the popup

function setupWorldCheck()
{
  document.querySelectorAll("input[name=editorMode]").forEach((radio) =>
    radio.addEventListener("change", () =>
    {
      // Inspecting needs the analysis, so it turns Check World on
      if(document.querySelector("#InspectRadioBtn").checked) setWorldCheck(true);
      else closeCellPopup();
    }));
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") closeCellPopup(); });
}

function toggleWorldCheck()
{
  setWorldCheck(!worldCheckOn);
}

function setWorldCheck(on)
{
  worldCheckOn = on;
  document.querySelector("#CheckWorldBtn").textContent = on ? "Hide Check" : "Check World";
  document.querySelector("#CheckPanel").hidden = !on;
  if(on) runWorldCheck();
  else
  {
    worldCheckResult = null;
    closeCellPopup();
    if(document.querySelector("#InspectRadioBtn").checked)
      document.querySelector("#RegularModeRadioBtn").checked = true;
  }
}

// What the analysis depends on: levels, doors, objectives, gates, start and end (not the view)
function currentWorldSignature()
{
  let save = grid.getGridStateSaveObject();
  return JSON.stringify([save.levels, save.startPosition, save.endPosition]);
}

// While the check is on, rerun it when the world changes (polled a few times a second)
function refreshWorldCheck()
{
  if(!worldCheckOn || millis() - worldCheckLastPoll < 300) return;
  worldCheckLastPoll = millis();
  if(currentWorldSignature() !== worldCheckSignature) runWorldCheck();
}

function runWorldCheck()
{
  worldCheckSignature = currentWorldSignature();
  worldCheckResult = WorldCheck.analyze(grid);
  renderCheckPanel(worldCheckResult);
  if(inspectedCell != null) showCellPopup(inspectedCell.x, inspectedCell.y, null);
}

function objectiveDot(i, colorName)
{
  let dot = document.createElement("span");
  dot.className = "objective-dot";
  dot.style.background = colorName || "#ccc";
  // White text on dark objective colors so the number stays readable
  let c = color(colorName || "#ccc");
  if(0.299 * red(c) + 0.587 * green(c) + 0.114 * blue(c) < 140) { dot.style.color = "#fff"; dot.style.textShadow = "none"; }
  dot.textContent = i;
  return dot;
}

// "#2 #12" as dots, or the fallback text when the list is empty
function objectiveList(indices, emptyText)
{
  let span = document.createElement("span");
  if(indices.length == 0) { span.textContent = emptyText; return span; }
  indices.forEach((i, k) =>
  {
    if(k > 0) span.append(" ");
    span.append(objectiveDot(i, Objective.allObjectives[i] ? Objective.allObjectives[i].color : null));
  });
  return span;
}

function renderCheckPanel(r)
{
  let panel = document.querySelector("#CheckPanel");
  panel.replaceChildren();
  let el = (tag, cls, text) => { let e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; };
  
  panel.append(el("h3", null, "World check"));
  let summary = el("div", "summary");
  summary.append(el("div", r.endReachable ? "ok" : "bad", r.endReachable ? "End reachable" : "End not reachable"));
  summary.append(el("div", null, "Reachable cells: " + r.reachableCount + " of " + r.cellCount));
  panel.append(summary);
  
  if(r.warnings.length > 0)
  {
    let list = el("ul", "warnings");
    r.warnings.forEach((w) => list.append(el("li", null, w)));
    panel.append(list);
  }
  else panel.append(el("div", "ok", "No problems found."));
  
  if(r.objectives.length == 0) { panel.append(el("p", null, "No objectives yet.")); return; }
  
  let intro = el("p", null, "Auto: picked up when reachable. Have: in hand from the start. Never: ignored. ");
  let reset = el("button", null, "Reset toggles");
  reset.onclick = () => { objectiveModes.clear(); runWorldCheck(); };
  intro.append(reset);
  panel.append(intro);
  
  let table = el("table");
  let head = el("tr");
  ["", "Status", "Needs", "Mode"].forEach((h) => head.append(el("th", null, h)));
  table.append(head);
  
  let statusText = { collected: "collected", have: "in hand", never: "ignored", unreachable: "can't be collected" };
  r.objectives.forEach((o) =>
  {
    let row = el("tr");
    let dotCell = el("td"); dotCell.append(objectiveDot(o.index, o.color));
    row.append(dotCell);
    row.append(el("td", o.status == "unreachable" ? "bad" : null, statusText[o.status]));
    let needs = el("td", "needs");
    if(o.status == "collected") needs.append(objectiveList(o.requires, "nothing"));
    else needs.textContent = "-";
    row.append(needs);
    
    let modeCell = el("td");
    let toggle = el("span", "mode-toggle");
    let obj = Objective.allObjectives[o.index];
    [["auto", "Auto"], ["have", "Have"], ["never", "Never"]].forEach(([mode, label]) =>
    {
      let b = el("button", getObjectiveMode(obj) == mode ? "active" : null, label);
      b.onclick = () =>
      {
        if(mode == "auto") objectiveModes.delete(obj); else objectiveModes.set(obj, mode);
        runWorldCheck();
      };
      toggle.append(b);
    });
    modeCell.append(toggle);
    row.append(modeCell);
    table.append(row);
  });
  panel.append(table);
}

// Darken the cells that can't be reached, and outline the inspected cell
function drawWorldCheckOverlay()
{
  let r = worldCheckResult;
  if(!worldCheckOn || r == null) return;
  let g = r.graph, s = grid.gridSize;
  
  for(let c = 0; c < g.cellX.length; c++)
  {
    if(r.base.reach[c]) continue;
    let p = grid.getScreenPosFromGridPos(createVector(g.cellX[c], g.cellY[c]));
    if(p.x > width || p.y > height || p.x + s < 0 || p.y + s < 0) continue;
    noStroke();
    fill(20, 20, 30, 120);
    rect(p.x, p.y, s, s);
    stroke(255, 255, 255, 90);
    strokeWeight(1);
    line(p.x, p.y + s, p.x + s, p.y);
  }
  
  if(inspectedCell != null)
  {
    let p = grid.getScreenPosFromGridPos(createVector(inspectedCell.x, inspectedCell.y));
    noFill();
    stroke("darkorange");
    strokeWeight(3);
    rect(p.x + 1, p.y + 1, s - 2, s - 2);
  }
}

function inspectCellUnderMouse(event)
{
  if(worldCheckResult == null) runWorldCheck();
  let pos = grid.screenPositionToGridPosition(createVector(mouseX, mouseY));
  showCellPopup(Math.floor(pos.x), Math.floor(pos.y), event);
}

// Fill in and place the popup for cell (x, y). event is the click (null to update it in place).
function showCellPopup(x, y, event)
{
  let popup = document.querySelector("#CellPopup");
  let d = worldCheckResult ? WorldCheck.describeCell(worldCheckResult, x, y) : null;
  if(d == null) { closeCellPopup(); return; }
  inspectedCell = { x, y };
  
  popup.replaceChildren();
  let line = (...parts) => { let div = document.createElement("div"); div.append(...parts); popup.append(div); return div; };
  let close = document.createElement("button");
  close.className = "close";
  close.textContent = "×";
  close.onclick = closeCellPopup;
  popup.append(close);
  let title = document.createElement("span");
  title.className = "title";
  title.textContent = (d.level || "Level") + "  (" + d.x + ", " + d.y + ")";
  popup.append(title);
  
  let dotFor = (i) => objectiveDot(i, Objective.allObjectives[i].color);
  if(d.objective >= 0)
  {
    let statusText = { collected: "collected", have: "in hand", never: "ignored", unreachable: "can't be collected" };
    line("Objective ", dotFor(d.objective), " (" + statusText[d.objectiveInfo.status] + ")");
  }
  if(d.gate >= 0) line("Gate: opens with ", dotFor(d.gate));
  else if(d.gate == NEEDS_REMOVED_OBJECTIVE) line("Gate: its objective was removed, so it never opens");
  
  if(d.reachable)
  {
    if(d.requires.length == 0 && d.exact) line("Reachable with nothing.");
    else if(d.requires.length == 0) line("Reachable several ways; no single objective is needed on every route.");
    else
    {
      line("Needs ", objectiveList(d.requires, ""));
      if(!d.exact) line("plus one of several alternative routes.");
    }
  }
  else
  {
    let div = line("Not reachable. " + d.reason);
    div.style.color = "firebrick";
  }
  
  let info = d.objectiveInfo;
  if(info && worldCheckResult.without[d.objective] && (info.lostCells > 0 || info.lostObjectives.length > 0))
  {
    let parts = ["Unlocks " + info.lostCells + " cell" + (info.lostCells == 1 ? "" : "s")];
    if(info.lostObjectives.length > 0) parts.push(" and objectives ", objectiveList(info.lostObjectives, ""));
    line(...parts);
  }
  
  popup.hidden = false;
  if(event != null)
  {
    // Next to the click, kept inside the window
    let px = (event.pageX !== undefined ? event.pageX : mouseX) + 14;
    let py = (event.pageY !== undefined ? event.pageY : mouseY) + 14;
    popup.style.left = Math.min(px, window.scrollX + window.innerWidth - popup.offsetWidth - 8) + "px";
    popup.style.top = Math.min(py, window.scrollY + window.innerHeight - popup.offsetHeight - 8) + "px";
  }
}

function closeCellPopup()
{
  inspectedCell = null;
  document.querySelector("#CellPopup").hidden = true;
}
