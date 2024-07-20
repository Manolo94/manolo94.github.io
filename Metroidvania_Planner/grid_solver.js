class Move
{
  // Positions are vectors in grid coordinates
  constructor(prevMove, currentPosition, objectivesReached)
  {
    this.prevMove = prevMove
    this.currentPosition = currentPosition
    this.objectivesReached = objectivesReached
  }
  
  toStr()
  {
    let positionStr = this.currentPosition.x + "," + this.currentPosition.y
    let objectiveStr = this.objectivesReached.join(",")
    
    return positionStr + ",(" + objectiveStr + ")"
  }
}

class GridSolver
{  
  // fromPosition and toPosition are vectors in grid space
  static GetPathFromTo(fromPosition, toPosition, grid)
  { 
    // Set to keep visited positions
    //  Due to Set limitations, positions will be encoded as an "x,y" string
    let visitedPositions = new Set();
    let positionHasBeenVisited = (move) => visitedPositions.has(move.toStr())
    let setPositionAsVisited = (move) => visitedPositions.add(move.toStr())
    
    let initialObjectiveState = []
    let allObjectives = grid.getAllObjectivesPositions()
    allObjectives.forEach((obj) => initialObjectiveState.push(false))
    let whatObjectiveReached = (pos) => allObjectives.findIndex((obj) => obj.x == pos.x && obj.y == pos.y)
    
    // Queue of vector positions
    var queue = [];
    queue.push(new Move(null, fromPosition, initialObjectiveState)) // enqueue
    
    let found = null
    
    while(queue.length > 0)
    {
      let currentMove = queue.shift(); // dequeue
      
      if(positionHasBeenVisited(currentMove)) continue
      
      // Reached the target position, stop the search
      if(currentMove.currentPosition.x == toPosition.x && currentMove.currentPosition.y == toPosition.y &&
        currentMove.objectivesReached.some((objReached) => objReached == false) == false)
      {
        found = currentMove
        break
      }
        
      let newObjectiveState = Array.from(currentMove.objectivesReached, (obj) => obj) // Copy all objectives in new array
      let objectiveReached = whatObjectiveReached(currentMove.currentPosition)
      if(objectiveReached >= 0) newObjectiveState[objectiveReached] = true
      
      let posInTheMiddleOfCell = p5.Vector.add(currentMove.currentPosition, createVector(0.5, 0.5))
        
      // Generate new positions if we can go there
      // Go left
      if(grid.canPassThrough(posInTheMiddleOfCell, createVector(-1, 0), newObjectiveState))
      {
        let newPosition = p5.Vector.add(currentMove.currentPosition, createVector(-1, 0))
        queue.push(new Move(currentMove, newPosition, newObjectiveState)) // enqueue
      }
      // Go right
      if(grid.canPassThrough(posInTheMiddleOfCell, createVector(1, 0), newObjectiveState))
      {
        let newPosition = p5.Vector.add(currentMove.currentPosition, createVector(1, 0))
        queue.push(new Move(currentMove, newPosition, newObjectiveState)) // enqueue
      }
      // Go up
      if(grid.canPassThrough(posInTheMiddleOfCell, createVector(0, -1), newObjectiveState))
      {
        let newPosition = p5.Vector.add(currentMove.currentPosition, createVector(0, -1))
        queue.push(new Move(currentMove, newPosition, newObjectiveState)) // enqueue
      }
      // Go down
      if(grid.canPassThrough(posInTheMiddleOfCell, createVector(0, 1), newObjectiveState))
      {
        let newPosition = p5.Vector.add(currentMove.currentPosition, createVector(0, 1))
        queue.push(new Move(currentMove, newPosition, newObjectiveState)) // enqueue
      }
      
      setPositionAsVisited(currentMove)
    }
    
    queue = null
    
    if(found != null)
    {
      console.log("Found Path!")
      
      let move = found
      let moveStack = []
      while(move != null)
      {
        moveStack.push(move.currentPosition)
        move = move.prevMove
      }
      
      /*
      console.log("=========")
      while(moveStack.length > 0)
      {
        let curPos = moveStack.pop()
        console.log(curPos.x + "," + curPos.y)
      }
      console.log("=========")*/
      
      return moveStack
    }
    else
    {
      console.log("Path not found!")
      
      return null
    }
  }
}