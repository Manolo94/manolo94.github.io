class GridState
{
  constructor()
  {
    // *** Things to save ***
    this.gridOriginInScreen = createVector(width/2, height/2); // Where the grid origin is in screen space
    this.gridSize = 20;
    // Level positioning is in grid units
    this.levels = []
    this.startPosition = createVector(0,0); // in grid units
    this.endPosition = createVector(5,0); // in grid units
    // **********************
  
    this.selectedLevel = null;
    this.selectedObjective = null;
    this.sizingBorders = createVector(0,0);
    this.hoveringOverLevel = null;
    this.nowTranslatingALevel = false;
    this.nowSizingALevel = false;
    this.inRegularMode = true;
    this.nowAddingDoors = false;
    this.nowAddingWalls = false;
    this.nowAddingObjectives = false;
    this.nowRemovingObjectives = false;
    this.nowSettingStartPosition = false;
    this.nowSettingEndPosition = false;
    this.nowAddingObstaclesToALevel = false;
    this.nowRemovingObstaclesFromALevel = false;
    
    this.path = [];
  }
  
  getGridStateSaveObject()
  {
    let levelsToSave = []
    this.levels.forEach((level) => 
    {
      levelsToSave.push(level.getLevelSaveObject())  
    })
    
    return {
      gridOriginInScreen: this.gridOriginInScreen,
      gridSize: this.gridSize,
      levels: levelsToSave,
      startPosition: this.startPosition,
      endPosition: this.endPosition
    }
  }
  
  getAllObjectivesPositions()
  {
    let allObjectives = []
    this.levels.forEach((level) =>{
      allObjectives.push(...level.getObjectivesInGlobalGridSpace())
    })
    return allObjectives
  }

  getAllObjectives()
  {
    let allObjectives = []
    this.levels.forEach((level) =>{
      allObjectives.push(...level.objectives)
    })
    return allObjectives
  }
  
  loadGridStateSaveObject(saveObject)
  {
    if(saveObject == null) return false;
    
    this.gridOriginInScreen = createVector(saveObject.gridOriginInScreen.x, saveObject.gridOriginInScreen.y)
    this.gridSize = saveObject.gridSize
    
    // Load levels individually (since the JSON doesn't know what class it is)
    saveObject.levels.forEach((level) =>
    {
      this.levels.push(Level.loadLevelSaveObject(level))
    })
    
    Objective.updateAllObjectives();
    
    this.startPosition = createVector(saveObject.startPosition.x, saveObject.startPosition.y)
    this.endPosition = createVector(saveObject.endPosition.x, saveObject.endPosition.y)
    
    return true;
  }
  
  panGrid(amountX, amountY)
  {
    this.gridOriginInScreen.add(createVector(amountX, amountY));
  }
  
  getScreenPosFromGridPos(posInGridCoords)
  {
    return p5.Vector.add(p5.Vector.mult(posInGridCoords, this.gridSize), 
                         grid.gridOriginInScreen);
  }

  screenPositionToGridPosition(posInScreenCoords)
  {
    return p5.Vector.div(p5.Vector.sub(posInScreenCoords, this.gridOriginInScreen), this.gridSize);
  }

  screenVectorToGridVector(vectorInScreenCoords)
  {
    return p5.Vector.div(vectorInScreenCoords, this.gridSize);
  }

  gridVectorToScreenVector(vectorInGridCoords)
  {
    return p5.Vector.mult(vectorInGridCoords, this.gridSize);
  }
  
  addNewLevel()
  {
    this.levels.push(new Level(createVector(-2,-2), createVector(4,4), color(255,0,0,150)));
  }
  
  // Return whether a player is able to move in the given direction from the given position
  //  position and direction are both vectors in grid coordinates
  //  direction can only be one of the following: (-1, 0), (1, 0), (0, -1) or (0, 1)
  canPassThrough(position, direction, currentObjectivesFound)
  {
    // Find what level the player is in
    let currentLevel = grid.levels.find((level) => level.isPositionInLevel(position));
    
    // Assert valid direction value
    console.assert(abs(direction.x) + abs(direction.y) == 1)
    
    let destPosition = p5.Vector.add(position, direction)
    let destinationLevel = grid.levels.find((level) => level.isPositionInLevel(destPosition));
    
    // Logic for passing through
    if(currentLevel === undefined) return false; // Player can only walk around levels
    if(destinationLevel === undefined) return false; // Player can't walk in a space where there are no levels
    if(currentLevel == destinationLevel)
    {
      let blocked = destinationLevel.checkIfObstacleBlocks(destPosition, currentObjectivesFound);
      return blocked == false;
    }
    if(currentLevel != destinationLevel)
    {
      // Check the current level walls
      if(currentLevel.checkIfWallBlocksOutboundMovement(position, direction))
        return false;
      
      // Check the destination level walls
      if(destinationLevel.checkIfWallBlocksInboundMovement(position, direction))
        return false;

      if(destinationLevel.checkIfObstacleBlocks(destPosition, currentObjectivesFound))
        return false;
      
      return true
    }
    return false
  }
  
  zoomGrid(wheelEvent)
  {
    let prevGridSize = this.gridSize;
  
    // Zoom out when delta is positive (gridSize gets smaller)
    this.gridSize -= event.delta/100;
    if(this.gridSize < width/100) this.gridSize = width/100;
    if(this.gridSize > width/5) this.gridSize = width/5;

    let deltaGridSize = this.gridSize - prevGridSize;

    // Move grid origin position in screen to keep
    //  whatever the mouse is hovering over on screen as we zoom in and out
    // First get the mouse position in grid coordinates
    let mouseInGrid = this.screenPositionToGridPosition(createVector(mouseX, mouseY));
    // Now apply the formula OriginPos'_x = - grid_x * deltaGridSize + OriginPos_x
    this.gridOriginInScreen.x = - mouseInGrid.x * deltaGridSize + this.gridOriginInScreen.x;
    this.gridOriginInScreen.y = - mouseInGrid.y * deltaGridSize + this.gridOriginInScreen.y;
  }
  
  setStartPosition(gridPosition)
  {
    this.startPosition = createVector(floor(gridPosition.x),floor(gridPosition.y));
  }
  
  setEndPosition(gridPosition)
  {
    this.endPosition = createVector(floor(gridPosition.x),floor(gridPosition.y));
  }
  
  setPathFromPathStack(pathStack)
  {
    this.path = []
    
    if(pathStack == null) return;
    
    while(pathStack.length > 0)
    {
      // Invert the stack into the path array
      this.path.push(pathStack.pop())
    }
  }
  
  drawStartAndEndPositions()
  {
    let startPosInScreen = this.getScreenPosFromGridPos(this.startPosition);
    let endPosInScreen = this.getScreenPosFromGridPos(this.endPosition);
    fill("white");
    strokeWeight(1);
    stroke(10);
    circle(startPosInScreen.x + this.gridSize/2, startPosInScreen.y + this.gridSize/2, this.gridSize/2);
    fill("yellow");
    circle(endPosInScreen.x + this.gridSize/2, endPosInScreen.y + this.gridSize/2, this.gridSize/2);
  }
  
  drawCurrentPath()
  {
    for(var i = 0; i < this.path.length - 1; i++)
    {
      // Move the "middle" around a bit, to be able to distinguish crossing paths
      let absoluteDistFromCenter = this.gridSize / 4;
      let offset = (i / (this.path.length) * absoluteDistFromCenter * 2) - absoluteDistFromCenter;

      let startPosInScreen = this.getScreenPosFromGridPos(this.path[i]);
      let endPosInScreen = this.getScreenPosFromGridPos(this.path[i+1]);

      if(i > 0) startPosInScreen = p5.Vector.add(startPosInScreen, createVector(offset, offset));
      if(i < this.path.length - 2) endPosInScreen = p5.Vector.add(endPosInScreen, createVector(offset, offset));
      
      // Set the path color to match how far along the way we are
      let pathColor = lerpColor(color("black"), color("white"), i / this.path.length);
      
      strokeWeight(2);
      stroke(pathColor)
      line(startPosInScreen.x + this.gridSize/2, startPosInScreen.y + this.gridSize/2,
           endPosInScreen.x + this.gridSize/2, endPosInScreen.y + this.gridSize/2)

      let middlePosInScreen = createVector((startPosInScreen.x + endPosInScreen.x + this.gridSize)/2,
                                           (startPosInScreen.y + endPosInScreen.y + this.gridSize)/2)
      
      stroke(pathColor)
      fill(pathColor)
      
      if(i%5 == 1)
      {
        let direction = p5.Vector.sub(this.path[i+1], this.path[i])

        if(direction.x != 0) // going right or left
        {
          // first 2 points aligned to the y axis
          let p1X = middlePosInScreen.x - this.gridSize * direction.x * 0.25; 
          let p1Y = middlePosInScreen.y - this.gridSize * 0.15;
          let p2X = middlePosInScreen.x - this.gridSize * direction.x * 0.25;
          let p2Y = middlePosInScreen.y + this.gridSize * 0.15;
          
          let p3X = middlePosInScreen.x + this.gridSize * direction.x * 0.25;
          let p3Y = middlePosInScreen.y;
          triangle(p1X, p1Y, p2X, p2Y, p3X, p3Y)
        }
        else if(direction.y != 0) // going up or down
        {
          // first 2 points aligned to the x axis
          let p1X = middlePosInScreen.x - this.gridSize * 0.15; 
          let p1Y = middlePosInScreen.y - this.gridSize * direction.y * 0.25;
          let p2X = middlePosInScreen.x + this.gridSize * 0.15; 
          let p2Y = middlePosInScreen.y - this.gridSize * direction.y * 0.25;
          
          let p3X = middlePosInScreen.x;
          let p3Y = middlePosInScreen.y + this.gridSize * direction.y * 0.25;
          triangle(p1X, p1Y, p2X, p2Y, p3X, p3Y)
        }
      }
    }
  }
  
  drawGrid()
  {
    // X axis
    let gridFractionalOffsetX = fract(this.gridOriginInScreen.x/this.gridSize);
    let gridFractionalOffsetInScreenX = gridFractionalOffsetX*this.gridSize;
    let increment = this.gridSize;
    let SHOW_ALL_GRID_SIZE_THRESHOLD = 20;
    for(var i = gridFractionalOffsetInScreenX; i <= width; i += increment)
    { 
      stroke(100);
      if(isCloseEnough(i, this.gridOriginInScreen.x))
      {
        strokeWeight(3);
        line(i, 0, i, height);
      }
      else if(increment >= SHOW_ALL_GRID_SIZE_THRESHOLD)
      {
        strokeWeight(1);
        line(i, 0, i, height);
      }
    }

    // Y axis
    let gridFractionalOffsetY = fract(this.gridOriginInScreen.y/this.gridSize);
    let gridFractionalOffsetInScreenY = gridFractionalOffsetY*this.gridSize;
    for(var j = gridFractionalOffsetInScreenY; j <= height; j += this.gridSize)
    { 
      if(isCloseEnough(j, this.gridOriginInScreen.y))
      {
        strokeWeight(3);
        line(0, j, width, j);
      }
      else if(increment >= SHOW_ALL_GRID_SIZE_THRESHOLD)
      {
        strokeWeight(1);
        line(0, j, width, j);
      }
    }
  }
}

