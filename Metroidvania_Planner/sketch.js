function setup() {
  createCanvas(1000, 1000);
  
  grid = new GridState();
  
  loadWorld();
  
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
  else if(mouseIsPressed)
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

function clearWorldConfirm()
{
  console.log("Clearing World...");
  
  document.getElementById("ClearWorldConfirmSpan").hidden = true;
  
  localStorage.removeItem('GridSaveObjectJSON')
  grid = new GridState()
}

function clearWorldCancel()
{
  document.getElementById("ClearWorldConfirmSpan").hidden = true;
}

function calculatePath()
{
  grid.setPathFromPathStack(GridSolver.GetPathFromTo(grid.startPosition, grid.endPosition, grid))
}

function isCloseEnough(value1, value2)
{
  return Math.abs(value1 - value2) < 1e-4;
}

function draw() {
  update();
  
  background(220);
  grid.drawGrid();
  
  let mousePosInGrid = grid.screenPositionToGridPosition(createVector(mouseX, mouseY));
  
  grid.levels.forEach((level) =>
  {
    level.drawLevel();
  });
  
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

function mousePressed()
{
  grid.selectedLevel = null;
  grid.nowTranslatingALevel = false;
  grid.nowSizingALevel = false;
  
  grid.levels.forEach((level) =>
  {
    if(level.isMouseInLevel())
    {
      grid.selectedLevel = level;
      
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