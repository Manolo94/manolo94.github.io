// Don't draw the walls exactly on top of the grid
const WALL_BORDER = 0.1; // percentage of gridSize

const OBJ_DEFAULT_COLORS = ["blue", "yellow", "green", "brown", "violet", "purple", "red"]

class Objective
{
  constructor(pos, color, parentLevelPos, parentLevelSize)
  {
    this.pos = pos;
    this.color = color;
    this.index = Objective.allObjectives.length;
    this.parentLevelPos = parentLevelPos;
    this.parentLevelSize = parentLevelSize;
    Objective.allObjectives.push(this)
  }
  
  drawObjective()
  {    
    if(this.pos.x < 0 || this.pos.y < 0 || 
       this.pos.x >= this.parentLevelSize.x || 
       this.pos.y >= this.parentLevelSize.y) 
      return;
      
    let objPosInScreen = grid.getScreenPosFromGridPos(p5.Vector.add(this.pos, this.parentLevelPos));
    fill(this.color);
    strokeWeight(1);
    stroke(10);
    circle(objPosInScreen.x + grid.gridSize/2, objPosInScreen.y + grid.gridSize/2, grid.gridSize/2);
    
    fill(100);
    textAlign(CENTER, CENTER)
    text(this.index+'', objPosInScreen.x + grid.gridSize/2, objPosInScreen.y + grid.gridSize/2);
  }
  
  static removeObjectiveByIdx(idx)
  {
    if(idx != -1)
    {
      Objective.allObjectives.splice(idx, 1);
    }
    // Reset all indexes
    for(let i = 0; i < Objective.allObjectives.length; i++)
      Objective.allObjectives[i].index = i;
  }
}

Objective.allObjectives = [];

class Level {
  
  constructor(pos, size, color) 
  {
    this.pos = pos;
    this.size = size;
    this.color = color;
    
    // One wall break array per side
    // Each wall break contains an integer representing the location (in grid units) of the 
    //  broken wall piece (FROM THE UPPER LEFT CORNER of the level).
    this.wallBreaks = [[], [], [], []] // left, right, top, bottom
    this.generateWallsToDraw();
    
    this.objectives = []; // list of objectives
  }
  
  // TODO: Put objectives in the grid state object, then reference them here
  //  Every time a level is moved, update the objectives location to keep the relative location with its level
  getObjectivesInGlobalGridSpace()
  {
    let globalSpaceObjs = []
    this.objectives.forEach((obj) => globalSpaceObjs.push(p5.Vector.add(obj.pos, this.pos)))
    return globalSpaceObjs
  }
  
  getLevelSaveObject()
  {
    return {
      pos: this.pos,
      size: this.size,
      colorStr: this.color.toString(),
      wallBreaks: this.wallBreaks,
      objectives: this.objectives
    }
  }
  
  static loadLevelSaveObject(saveObject)
  {
    let newLevelPos = createVector(saveObject.pos.x, saveObject.pos.y)
    let newLevelSize = createVector(saveObject.size.x, saveObject.size.y)
    let newLevelColor = color(saveObject.colorStr)
    
    let newLevel = new Level(newLevelPos, newLevelSize, newLevelColor)
    newLevel.wallBreaks = saveObject.wallBreaks
    
    newLevel.objectives = []
    saveObject.objectives.forEach((obj) =>
    {
      if(obj.pos !== undefined && obj.color !== undefined)
      {
        newLevel.objectives.push(new Objective(createVector(obj.pos.x, obj.pos.y), obj.color, 
                                               newLevel.pos, newLevel.size))
      }
    })
    
    newLevel.generateWallsToDraw()
    
    return newLevel
  }
  
  // Amount is a vector
  translateLevel(gridAmount) 
  {  
    this.pos.add(gridAmount);
  }
  
  addWallBreak(gridPosition)
  {
    let whichEdge = this.isCloseToEdge(gridPosition);
    
    // get what piece to break
    let breakPieceX = floor(gridPosition.x) - this.pos.x;
    let breakPieceY = floor(gridPosition.y) - this.pos.y;
    
    if(whichEdge.x == -1) // left edge
    {
      if(this.wallBreaks[0].includes(breakPieceY) == false)
      {
        this.wallBreaks[0].push(breakPieceY);
        // generateWallsToDraw() needs wallBreaks to be sorted
        //  needed to specify the compare function since by default is alphabetic order
        this.wallBreaks[0].sort(function(a, b){return a-b});
      }
    }
    
    if(whichEdge.x == 1) // right edge
    {
      if(this.wallBreaks[1].includes(breakPieceY) == false)
      {
        this.wallBreaks[1].push(breakPieceY);
        // generateWallsToDraw() needs wallBreaks to be sorted
        //  needed to specify the compare function since by default is alphabetic order
        this.wallBreaks[1].sort(function(a, b){return a-b});
      }
    }
    
    if(whichEdge.y == -1) // top edge
    {
      if(this.wallBreaks[2].includes(breakPieceX) == false)
      {
        this.wallBreaks[2].push(breakPieceX);
        // generateWallsToDraw() needs wallBreaks to be sorted
        //  needed to specify the compare function since by default is alphabetic order
        this.wallBreaks[2].sort(function(a, b){return a-b});
      }
    }
    
    if(whichEdge.y == 1) // bottom edge
    {
      if(this.wallBreaks[3].includes(breakPieceX) == false)
      {
        this.wallBreaks[3].push(breakPieceX);
        // generateWallsToDraw() needs wallBreaks to be sorted
        //  needed to specify the compare function since by default is alphabetic order
        this.wallBreaks[3].sort(function(a, b){return a-b});
      }
    }
    
    this.generateWallsToDraw();
  }
  
  removeWallBreak(gridPosition)
  {
    let whichEdge = this.isCloseToEdge(gridPosition);
    
    // get what piece to break
    let restorePieceX = floor(gridPosition.x) - this.pos.x;
    let restorePieceY = floor(gridPosition.y) - this.pos.y;
    
    //console.log(restorePieceX + " " + restorePieceY + " -> " + whichEdge);
    //console.log("before: [" + this.wallBreaks[0] + "] [" + this.wallBreaks[1] + "] [" +
    //            this.wallBreaks[2] + "] [" + this.wallBreaks[3] + "]");
    
    if(whichEdge.x == -1) // left edge
    {
      if(this.wallBreaks[0].includes(restorePieceY))
      {
        this.wallBreaks[0].splice(this.wallBreaks[0].indexOf(restorePieceY), 1);
      }
    }
    
    if(whichEdge.x == 1) // right edge
    {
      if(this.wallBreaks[1].includes(restorePieceY))
      {
        this.wallBreaks[1].splice(this.wallBreaks[1].indexOf(restorePieceY), 1);
      }
    }
    
    if(whichEdge.y == -1) // top edge
    {
      if(this.wallBreaks[2].includes(restorePieceX))
      {
        this.wallBreaks[2].splice(this.wallBreaks[2].indexOf(restorePieceX), 1);
      }
    }
    
    if(whichEdge.y == 1) // bottom edge
    {
      if(this.wallBreaks[3].includes(restorePieceX))
      {
        this.wallBreaks[3].splice(this.wallBreaks[3].indexOf(restorePieceX), 1);
      }
    }
    
    //console.log("after: [" + this.wallBreaks[0] + "] [" + this.wallBreaks[1] + "] [" +
    //            this.wallBreaks[2] + "] [" + this.wallBreaks[3] + "]");
    
    this.generateWallsToDraw();
  }
  
  addObjective(gridPosition)
  {
    let newObjectivePos = createVector(floor(gridPosition.x - this.pos.x),floor(gridPosition.y - this.pos.y));
    
    // TODO: Need to add a color picker. Rotate around the default colors for now
    let newObjectiveColor = OBJ_DEFAULT_COLORS[(Objective.allObjectives.length % OBJ_DEFAULT_COLORS.length)]
    
    let newObjective = new Objective(newObjectivePos, newObjectiveColor, this.pos, this.size)
    let objectiveIdx = this.objectives.findIndex((obj) => obj.pos.x == newObjective.x && 
                                                          obj.pos.y == newObjective.y);
    
    if(objectiveIdx == -1) this.objectives.push(newObjective);
    //console.log("Added new objective " + this.objectives);
  }
  
  removeObjective(gridPosition)
  {
    let objectiveToRemove = createVector(floor(gridPosition.x - this.pos.x),floor(gridPosition.y - this.pos.y));
    
    let objectiveIdx = this.objectives.findIndex((obj) => obj.pos.x == objectiveToRemove.x && 
                                                          obj.pos.y == objectiveToRemove.y);
    
    if(objectiveIdx != -1)
    {
      let removedObj = this.objectives.splice(objectiveIdx, 1)[0];
      Objective.removeObjectiveByIdx(removedObj.index);
    }
    //console.log("Removed " + this.objectives + " " + objectiveIdx);
  }

  // Depending on the value of the bordersToAdjust vector, move the border of this level to that position
  adjustLevelSize(bordersToAdjust, gridPosition) 
  {
    if(bordersToAdjust.x == 0 && bordersToAdjust.y == 0) return;

    let desiredLeft   = this.pos.x;
    let desiredRight  = this.pos.x + this.size.x;
    let desiredTop    = this.pos.y;
    let desiredBottom = this.pos.y + this.size.y;

    // Adjusting left
    if(bordersToAdjust.x == -1)
    {
      // Need to move the position, and adjust the size according
      desiredLeft = round(gridPosition.x); // snap to grid

      if(desiredLeft >= desiredRight) desiredLeft = desiredRight - 1; // can't make the size less than 1
    }

    // Adjusting right
    if(bordersToAdjust.x == 1)
    {
      // Need to move the position, and adjust the size according
      desiredRight = round(gridPosition.x); // snap to grid

      if(desiredLeft >= desiredRight) desiredRight = desiredLeft + 1; // can't make the size less than 1
    }

    // Adjusting top
    if(bordersToAdjust.y == -1)
    {
      // Need to move the position, and adjust the size according
      desiredTop = round(gridPosition.y); // snap to grid

      if(desiredTop >= desiredBottom) desiredTop = desiredBottom - 1; // can't make the size less than 1
    }

    // Adjusting bottom
    if(bordersToAdjust.y == 1)
    {
      // Need to move the position, and adjust the size according
      desiredBottom = round(gridPosition.y); // snap to grid

      if(desiredTop >= desiredBottom) desiredBottom = desiredTop + 1; // can't make the size less than 1
    }

    this.pos.x = desiredLeft;
    this.pos.y = desiredTop;
    this.size.x = desiredRight - desiredLeft;
    this.size.y = desiredBottom - desiredTop;
    
    this.generateWallsToDraw(); // since the size changed, generate wallsToDraw
  }
  
  // Returns a vector depending on what edge the position is close to:
  //  (-1, 0) = left border, (0, 1) = bottom border, (1,1) = bottom-right border
  isCloseToEdge(gridPosition)
  {
    let result = createVector(0,0)
    // Close to the left
    if(Math.abs(this.pos.x - gridPosition.x) < 0.25 && 
       gridPosition.y >= this.pos.y && gridPosition.y < this.pos.y + this.size.y)
      result.x = -1;
    // Close to the right
    if(Math.abs(this.pos.x + this.size.x - gridPosition.x) < 0.25 &&
       gridPosition.y >= this.pos.y && gridPosition.y < this.pos.y + this.size.y)
      result.x = 1;
    // Close to the top
    if(Math.abs(this.pos.y - gridPosition.y) < 0.25 &&
       gridPosition.x >= this.pos.x && gridPosition.x < this.pos.x + this.size.x)
      result.y = -1;
    // Close to the bottom
    if(Math.abs(this.pos.y + this.size.y - gridPosition.y) < 0.25 &&
       gridPosition.y >= this.pos.y && gridPosition.y < this.pos.y + this.size.y)
      result.y = 1;

    return result;
  }

  // BordersToHighlight is a vector as follows:
  //  (-1, 0) = left border, (0, 1) = bottom border, (1,1) = bottom-right border
  drawHighlightBorder(bordersToHighlight, highlightColor)
  {
    if(bordersToHighlight.x == 0 && bordersToHighlight.y == 0) return;

    let screenLevelPosUpperLeft = grid.getScreenPosFromGridPos(this.pos);
    let screenLevelPosLowerRight = grid.getScreenPosFromGridPos(p5.Vector.add(this.pos, this.size));
    let screenLevelSize = grid.gridVectorToScreenVector(this.size);

    let borderWidth = 6;

    // Left
    if(bordersToHighlight.x == -1)
    {
      fill(highlightColor);
      noStroke();
      rect(screenLevelPosUpperLeft.x, screenLevelPosUpperLeft.y, 
         borderWidth, screenLevelSize.y);
    }

    // Right
    if(bordersToHighlight.x == 1)
    {
      fill(highlightColor);
      noStroke();
      rect(screenLevelPosLowerRight.x - borderWidth, screenLevelPosUpperLeft.y, 
         borderWidth, screenLevelSize.y);
    }

    // Top
    if(bordersToHighlight.y == -1)
    {
      fill(highlightColor);
      noStroke();
      rect(screenLevelPosUpperLeft.x, screenLevelPosUpperLeft.y, 
         screenLevelSize.x, borderWidth);
    }

    // Bottom
    if(bordersToHighlight.y == 1)
    {
      fill(highlightColor);
      noStroke();
      rect(screenLevelPosUpperLeft.x, screenLevelPosLowerRight.y - borderWidth, 
         screenLevelSize.x, borderWidth);
    }
  }
  
  snapLevelToGrid()
  {
    this.pos.x = round(this.pos.x);
    this.pos.y = round(this.pos.y);
  }
  
  // gridPosition is a vector in grid coordinates
  isPositionInLevel(gridPosition)
  {
    let upperLeft = this.pos
    let lowerRight = p5.Vector.add(this.pos, this.size);
    if(gridPosition.x >= upperLeft.x && gridPosition.x < lowerRight.x &&
       gridPosition.y >= upperLeft.y && gridPosition.y < lowerRight.y)
      return true;
    return false;
  }

  isMouseInLevel()
  {
    let screenLevelPosUpperLeft = grid.getScreenPosFromGridPos(this.pos);
    let screenLevelPosLowerRight = grid.getScreenPosFromGridPos(p5.Vector.add(this.pos, this.size));
    if(mouseX > screenLevelPosUpperLeft.x && mouseX < screenLevelPosLowerRight.x &&
       mouseY > screenLevelPosUpperLeft.y && mouseY < screenLevelPosLowerRight.y)
      return true;
    return false;
  }
  
  drawLevel()
  {
    // Draw level background
    fill(this.color);
    noStroke();
    
    // Get level real coordinates
    let screenLevelPosUpperLeft = grid.getScreenPosFromGridPos(this.pos);
    screenLevelPosUpperLeft.add(createVector(WALL_BORDER*grid.gridSize, WALL_BORDER*grid.gridSize));
    let screenLevelSize = grid.gridVectorToScreenVector(this.size);
    // x2, to account for the border on both sides
    screenLevelSize.add(createVector(-2*WALL_BORDER*grid.gridSize, -2*WALL_BORDER*grid.gridSize));
    rect(screenLevelPosUpperLeft.x, screenLevelPosUpperLeft.y, 
         screenLevelSize.x, screenLevelSize.y);
    
    // Draw walls
    this.drawLevelWalls();
    
    // Draw objectives
    this.drawObjectives();
  }
  
  // Returns true if there's a wall blocking player movement when moving in the given direction
  //  from the given position, while leaving the level
  //  position and direction are both vectors
  //  direction can only be one of the following: (-1, 0), (1, 0), (0, -1) or (0, 1)
  checkIfWallBlocksOutboundMovement(gridPosition, direction)
  {
    // Assert valid direction value
    console.assert(abs(direction.x) + abs(direction.y) == 1)
    
    let leftEdgeX = this.pos.x
    let rightEdgeX = this.pos.x + this.size.x
    let topEdgeY = this.pos.y
    let bottomEdgeY = this.pos.y + this.size.y
    
    // Check going left
    if(direction.x == -1 && direction.y == 0)
    {
      let wallBreakMatchesY = this.wallBreaks[0].some((wBreak) => gridPosition.y >= wBreak + this.pos.y && 
                                                                  gridPosition.y <  wBreak + this.pos.y + 1)
      let positionNearLeftEdge = gridPosition.x >= leftEdgeX && gridPosition.x < leftEdgeX + 1
      
      //console.log(gridPosition.x + "," + gridPosition.y + 
      //            " => Going left " + wallBreakMatchesY + " " + positionNearLeftEdge);
      return positionNearLeftEdge == false || wallBreakMatchesY == false
    }
    
    // Check going right
    if(direction.x == 1 && direction.y == 0)
    {
      let wallBreakMatchesY = this.wallBreaks[1].some((wBreak) => gridPosition.y >= wBreak + this.pos.y && 
                                                                  gridPosition.y <  wBreak + this.pos.y + 1)
      let positionNearRightEdge = gridPosition.x > rightEdgeX - 1 && gridPosition.x <= rightEdgeX
      //console.log(gridPosition.x + "," + gridPosition.y + 
      //            " => Going right " + wallBreakMatchesY + " " + positionNearRightEdge);
      return positionNearRightEdge == false || wallBreakMatchesY == false
    }
    
    // Check going up
    if(direction.x == 0 && direction.y == -1)
    {
      let wallBreakMatchesX = this.wallBreaks[2].some((wBreak) => gridPosition.x >= wBreak + this.pos.x && 
                                                                  gridPosition.x <  wBreak + this.pos.x + 1)
      let positionNearTopEdge = gridPosition.y > topEdgeY && gridPosition.y <= topEdgeY + 1
      //console.log(gridPosition.x + "," + gridPosition.y + 
      //            " => Going up " + wallBreakMatchesX + " " + positionNearTopEdge);
      return positionNearTopEdge == false || wallBreakMatchesX == false
    }
    // Check going down
    if(direction.x == 0 && direction.y == 1)
    {
      let wallBreakMatchesX = this.wallBreaks[3].some((wBreak) => gridPosition.x >= wBreak + this.pos.x && 
                                                                  gridPosition.x <  wBreak + this.pos.x + 1)
      let positionNearBottomEdge = gridPosition.y > bottomEdgeY - 1 && gridPosition.y <= bottomEdgeY
      //console.log(gridPosition.x + "," + gridPosition.y + 
      //            " => Going down " + wallBreakMatchesX + " " + positionNearBottomEdge);
      return positionNearBottomEdge == false || wallBreakMatchesX == false
    }
  }
  
  // Returns true if there's a wall blocking player movement when moving in the given direction
  //  from the given position
  //  position and direction are both vectors
  //  direction can only be one of the following: (-1, 0), (1, 0), (0, -1) or (0, 1)
  // TODO: A little bit of a hack, make this more generic, so that the same WallBlock 
  //  function works correctly the same for both inbound and outbound movement inquiries
  checkIfWallBlocksInboundMovement(gridPosition, direction)
  {
    // Remap to an outbound movement
    let insidePosition = p5.Vector.add(gridPosition, direction)
    let oppositeDirection = p5.Vector.mult(direction, -1)
    return this.checkIfWallBlocksOutboundMovement(insidePosition, oppositeDirection)
  }
  
  generateWallsToDraw()
  {
    this.wallsToDraw = []
    this.wallsToDraw[0] = this.generateWallPiecesToDraw(this.wallBreaks[0], this.size.y); // left wall
    this.wallsToDraw[1] = this.generateWallPiecesToDraw(this.wallBreaks[1], this.size.y); // right wall
    this.wallsToDraw[2] = this.generateWallPiecesToDraw(this.wallBreaks[2], this.size.x); // top wall
    this.wallsToDraw[3] = this.generateWallPiecesToDraw(this.wallBreaks[3], this.size.x); // bottom wall
  }
  
  // Returns a list of even length, 
  //  where even elements represent where the line segment starts, 
  //  and odd elements where the line segment ends
  generateWallPiecesToDraw(wallBreakList, wallSize)
  {
    let result = []
    
    let currentBrokenIndex = 0;
    let beginIndex = -1;
    for(var i = 0; i < wallSize; i++)
    {
      if(currentBrokenIndex < wallBreakList.length)
      {
        if(wallBreakList[currentBrokenIndex] == i)
        {
          // Draw a piece of wall if right and left index are valid
          if(beginIndex != -1)
          {
            // add line from left -> i
            result.push(beginIndex);
            result.push(i);
          }
          currentBrokenIndex++;
          beginIndex = -1;
        }
        else
        {
          if(beginIndex == -1) beginIndex = i;
        }
      }
      else
      {
        beginIndex = i;
        break;
      }
    }
    // Finish drawing the rest of the wall
    if(beginIndex != -1)
    {
      // add line from left to wallSize
      result.push(beginIndex);
      result.push(wallSize);
    }
    
    return result;
  }
  
  drawLevelWalls()
  {
    noFill();
    stroke(0); // walls are black
    strokeWeight(5);
    
    // Get level in screen coordinates
    let upperLeft = grid.getScreenPosFromGridPos(this.pos); 
    upperLeft.add(createVector(WALL_BORDER*grid.gridSize, WALL_BORDER*grid.gridSize)); // Add border
    let lowerRight = grid.getScreenPosFromGridPos(p5.Vector.add(this.pos, this.size)); 
    lowerRight.add(createVector(-WALL_BORDER*grid.gridSize, -WALL_BORDER*grid.gridSize)); // Add border
    
    // Draw one wall
    // left wall
    for(let i = 0; i < this.wallsToDraw[0].length; i+=2) // wallsToDraw come in pairs
    {
      let begin = upperLeft.y + this.wallsToDraw[0][i]*grid.gridSize;
      let end = upperLeft.y + this.wallsToDraw[0][i+1]*grid.gridSize;
      if(end > lowerRight.y) end = lowerRight.y;
      if(this.wallsToDraw[0][i] != 0) begin -= 2*WALL_BORDER*grid.gridSize; // add a little bevel to the openings
      line(upperLeft.x, begin, upperLeft.x, end);
    }
    
    // right wall
    for(let i = 0; i < this.wallsToDraw[1].length; i+=2) // wallsToDraw come in pairs
    {
      let begin = upperLeft.y + this.wallsToDraw[1][i]*grid.gridSize;
      let end =  upperLeft.y + this.wallsToDraw[1][i+1]*grid.gridSize;
      if(end > lowerRight.y) end = lowerRight.y;
      if(this.wallsToDraw[1][i] != 0) begin -= 2*WALL_BORDER*grid.gridSize; // add a little bevel to the openings
      line(lowerRight.x, begin, lowerRight.x, end);
    }
    
    // top wall
    for(let i = 0; i < this.wallsToDraw[2].length; i+=2) // wallsToDraw come in pairs
    {
      let begin = upperLeft.x + this.wallsToDraw[2][i]*grid.gridSize;
      let end = upperLeft.x + this.wallsToDraw[2][i+1]*grid.gridSize;
      if(end > lowerRight.x) end = lowerRight.x;
      if(this.wallsToDraw[2][i] != 0) begin -= 2*WALL_BORDER*grid.gridSize; // add a little bevel to the openings
      line(begin,  upperLeft.y, end, upperLeft.y);
    }
    
    // bottom wall
    for(let i = 0; i < this.wallsToDraw[3].length; i+=2) // wallsToDraw come in pairs
    {
      let begin = upperLeft.x + this.wallsToDraw[3][i]*grid.gridSize;
      let end = upperLeft.x + this.wallsToDraw[3][i+1]*grid.gridSize;
      if(end > lowerRight.x) end = lowerRight.x;
      if(this.wallsToDraw[3][i] != 0) begin -= 2*WALL_BORDER*grid.gridSize; // add a little bevel to the openings
      line(begin,  lowerRight.y, end, lowerRight.y);
    }
  }
  
  drawObjectives()
  {
    this.objectives.forEach((obj) =>
    {
      obj.drawObjective();
    });
  }
}