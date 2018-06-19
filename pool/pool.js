//*************************************************//
//						GAME					   //
//*************************************************//
var Game = {};
Game.frame = 0;
Game.frameCount = 0;
Game.fps = 60;
Game.realFps = -1;

Game._intervalId = setInterval(Game.run, 1000 / Game.fps);

Game.initialize = function()
{
	var sideCells = document.getElementById("sideCellsTxt").value;
	var numPellets = document.getElementById("numPelletsTxt").value;
	var thermalCond = document.getElementById("thermalCondTxt").value;
	var pelletMass = document.getElementById("pelletMassTxt").value;
	var numHeatSources = document.getElementById("numHeatSourcesTxt").value;
	
	// initialize main PoolBoard
	board = new PoolBoard(canvas.width,
		                  sideCells,
		                  thermalCond,
		                  numPellets,
		                  pelletMass,
						  numHeatSources);
}

Game.fpsCounter = function()
{
	Game.realFps = Game.frame;
	Game.frame = 0;
};

Game.run = function()
{
	setInterval(function() {
		Game.update();
		Game.draw();
	}, 1000 / Game.fps);

	setInterval(Game.fpsCounter, 1000);
};

Game.update = function()
{
	board.update();
};

Game.draw = function()
{
	context.fillStyle = 'white';
	context.clearRect(0, 0, canvas.width, canvas.height);

	board.draw();

	Game.frame++; Game.frameCount++;

	context.fillStyle = 'black';
	context.font = 'italic 20pt Calibri';
	context.textAlign = 'right';
	context.textBaseline = 'top';
	context.fillText("FPS: " + Game.realFps, 490, 0);
	context.fillStyle = 'white';
	context.fillText("FPS: " + Game.realFps, 492, 2);
};

// From 0 to 255 {r g b a}
Game.setContextToColor = function(tempColor)
{
	context.fillStyle = "rgba("+tempColor.r+","+tempColor.g+","
								+tempColor.b+","+tempColor.a+")";
};

//*************************************************//
//					POOL BOARD					   //
//*************************************************//
function PoolBoard(canvasWidth = 1, sideCells = 1, baseThermalConductivity = 0, numPellets = 0, pelletMass = 1, numHeatSources = 0)
{
	this.initialize(canvasWidth, sideCells, baseThermalConductivity, numPellets, pelletMass, numHeatSources);
}

// Directions (0 - up, 1 - left, 2 - down, 3 - right)
PoolBoard.DIRECTIONS = [{x:0,y:-1},{x:-1,y:0},{x:0,y:1},{x:1,y:0}];
// Directions (0 - up, 1 - up-left, 2 - left, 3 - down-left, 
// 			   4 - down, 5 - down-right, 6 - right, 7 - up-right )
PoolBoard.EIGHT_DIRECTIONS = [{x:0,y:-1},{x:-1,y:-1},{x:-1,y:0},{x:-1,y:1},
						      {x:0,y: 1},{x:1,y:1},{x:0,y:1},{x:1,y:-1}];

PoolBoard.Pellet = function(x, y, size, mass, heatContribution)
{
	this.x = x;
	this.y = y;
    this.heatContribution = heatContribution;
	this.size = size;
	this.mass = mass;
};

PoolBoard.SinHeatSource = function(x, y, period)
{
	this.x = x; this.y = y;
	this.period = period;
};

PoolBoard.prototype.initialize = function(canvasWidth, sideCells, baseThermalConductivity, numPellets, pelletMass, numHeatSources) 
{		
	this.sideCells = sideCells;
	this.cellSize = canvasWidth / this.sideCells;
	this.baseThermalConductivity = baseThermalConductivity;
	this.numPellets = numPellets;
	this.pelletMass = pelletMass;
	this.numHeatSources = numHeatSources;

	// Initialize cells
	this.cells = [];
	for(var x = 0; x < this.sideCells; x++)
	{
		this.cells[x] = [];
		for(var y = 0; y < this.sideCells; y++)
			this.cells[x][y] = Math.random();
	}

	// Initialize pellets
	this.PelletList = [];
	for( var p = 0; p < this.numPellets; p++ )
	{
		this.PelletList[p] = new PoolBoard.Pellet(Math.random()*500, Math.random()*500, 2, this.pelletMass, (Math.random()*20-10)*0.01);
	}

	// Initialize sin heat sources
	this.SinHeatSourceList = [];
	for( var s = 0; s < this.numHeatSources; s++)
	{
		this.SinHeatSourceList[s] = new PoolBoard.SinHeatSource(Math.floor(Math.random()*this.sideCells), 
										Math.floor(Math.random()*this.sideCells), Math.random()*30 + 30);
	}
};

PoolBoard.prototype.draw = function() {
	// Draw each cell
	for(var x = 0; x < this.sideCells; x++)
		for(var y = 0; y < this.sideCells; y++)
		{
			var tempColor = PoolBoard.getTemperatureColor(this.cells[x][y]);
			Game.setContextToColor(tempColor);
			context.fillRect(x*this.cellSize, y*this.cellSize, 
				               this.cellSize,   this.cellSize);
		}

	// Draw the pellets
	context.fillStyle = 'black';
	for( var p = 0; p < this.numPellets; p++ )
	{
		var pellet = this.PelletList[p];
		context.fillRect(pellet.x+pellet.size/2, pellet.y+pellet.size/2, pellet.size, pellet.size);
	}
};

PoolBoard.prototype.update = function() {
	var cellChanges = [];
	var cells = this.cells;
	var cellFlowX = [];
	var cellFlowY = [];
	var cellPelletList = [];
	var pelletVel = [];
    
    // Do nothing if not initialized
	if(cells === undefined || cells[0] === undefined) return;
    
    // Calculate all cells temperature change
	for(var x = 0; x < this.sideCells; x++)
	{
		cellChanges[x] = [];
		cellFlowX[x] = [];
		cellFlowY[x] = [];
		cellPelletList[x] = [];
		for(var y = 0; y < this.sideCells; y++)
		{
			cellChanges[x][y] = 0.0;
			cellFlowX[x][y] = 0.0;
			cellFlowY[x][y] = 0.0;
			cellPelletList[x][y] = [];
            
            for(var dir = 0; dir < PoolBoard.DIRECTIONS.length; dir++)
            {
                var direction = PoolBoard.DIRECTIONS[dir];
                
                var nextCell = PoolBoard.getNextCell(x,y,direction,this.sideCells);
                
                var change = PoolBoard.getTemperatureChange(cells[x][y], cells[nextCell.x][nextCell.y], this.baseThermalConductivity);
                cellChanges[x][y] += change;
                // positive change means heat is coming from there, so cellFlow is in the opposite direction
                cellFlowX[x][y] += -change*direction.x; // direction.x will be 0 when y != 0
                cellFlowY[x][y] += -change*direction.y; // direction.x will be 0 when x != 0
                
            }
		}
	}

    // Apply temperature change
	for(var x = 0; x < this.sideCells; x++)
		for(var y = 0; y < this.sideCells; y++)
			if(Math.abs(cellChanges[x][y]) > 0.000001)
			{
				cells[x][y] += cellChanges[x][y];
                
                // Cap temperature at 1.0 and 0.0
                if(cells[x][y] > 1.0) cells[x][y] = 1.0;
			    if(cells[x][y] < 0.0) cells[x][y] = 0.0;
			}

    // Simulate all heat sources changing through time
	for(var s = 0; s < this.numHeatSources; s++)
	{
		var heatSource = this.SinHeatSourceList[s];
		cells[heatSource.x][heatSource.y] = Math.sin(Game.frameCount/heatSource.period);
	}

    // Update the pellets
	for( var p = 0; p < this.numPellets; p++ )
	{
		var pellet = this.PelletList[p];
		
        // Get the cell for the current pellet
		var cellX = Math.floor(pellet.x / this.cellSize);
		var cellY = Math.floor(pellet.y / this.cellSize);

		// Add the current pellet to the corresponding cellPelletList
		cellPelletList[cellX][cellY].push(p);

        // Just in case a pellet is outside the board
		if(cellX >= this.sideCells) cellX = this.sideCells - 1;
		if(cellX < 0) cellX = 0;
		if(cellY >= this.sideCells) cellY = this.sideCells -1;
		if(cellY < 0) cellY = 0;

        // Calculate the velocity of the pellet based on the current cells flow
		pelletVel[p] = {};
		pelletVel[p].x = cellFlowX[cellX][cellY]*(10000/pellet.mass);
		pelletVel[p].y = cellFlowY[cellX][cellY]*(10000/pellet.mass);	
	}

	// Check for collisionsi and apply velocity
	for( var p = 0; p < this.numPellets; p++ )
	{

		var pellet = this.PelletList[p];
		
        // Get the cell for the current pellet
		var cellX = Math.floor(pellet.x / this.cellSize);
		var cellY = Math.floor(pellet.y / this.cellSize);

		// Go to the next cell in all eight directions
		for( var dir = 0; dir < PoolBoard.EIGHT_DIRECTIONS.length; dir++)
		{
			var direction = PoolBoard.EIGHT_DIRECTIONS[dir];

			var nextCell = PoolBoard.getNextCell(cellX,cellY,direction,this.sideCells);

			// Check only with pellets within that cell
			for( var pi = 0; pi < cellPelletList[nextCell.x][nextCell.y].length; pi++ )
			{
				var currentPelletID = cellPelletList[nextCell.x][nextCell.y][pi];
				// dont try to collide with itself
				if(currentPelletID == p) continue;

				var pelletP = this.PelletList[currentPelletID];

				var dist = PoolBoard.getSqrdDistance(pellet.x + pelletVel[p].x, pellet.y + pelletVel[p].y,
													pelletP.x, pelletP.y);

				if(dist < (pelletP.size + pellet.size)*(pelletP.size + pellet.size) )
				{

					// binary search the right multiplier
					var vML = 0.0; // vel multiplier low
					var vMH = 1.0; // vel multiplier high

					while(Math.abs(vML - vMH) > 0.0001)
					{
						var midVelX = (vMH+vML)/2*pelletVel[p].x;
						var midVelY = (vMH+vML)/2*pelletVel[p].y;

						var middleDist = PoolBoard.getSqrdDistance(pellet.x + midVelX, 
													pellet.y + midVelY,
													pelletP.x, pelletP.y);

						// collision, go down
						if(middleDist < (pelletP.size + pellet.size)*(pelletP.size + pellet.size) )
						{
							vMH = (vMH+vML)/2;						
						}
						else
						{
							vML = (vMH+vML)/2;
						}
					}

					pelletVel[p].x *= vML;
					pelletVel[p].y *= vML;
				}
			}
		}

        // Update position
		pellet.x += pelletVel[p].x;
		pellet.y += pelletVel[p].y;

        // Wrap around
		if(pellet.x > canvas.width)
			pellet.x = 0;
		if(pellet.x < 0)
			pellet.x = canvas.width - 1;
		if(pellet.y > canvas.height)
			pellet.y = 0;
		if(pellet.y < 0)
			pellet.y = canvas.height - 1;
        
        // Update heat contribution to the current cell
        cells[cellX][cellY] += pellet.heatContribution;
	}
};

// Temp1 temp2 from 0 to 1.0
PoolBoard.getTemperatureChange = function(sourceTemp, targetTemp, thermalConductivity)
{
	return (targetTemp - sourceTemp)*thermalConductivity;
}

PoolBoard.getSqrdDistance = function(pellet1X, pellet1Y, pellet2X, pellet2Y)
{
	var distX = pellet1X - pellet2X;
	var distY = pellet1Y - pellet2Y;
	return distX*distX + distY*distY;
}

// Temperature from 0.0 to 1.0
PoolBoard.getTemperatureColor = function(temperature)
{
	var color = {};
	color.r = Math.floor(temperature*255);
	color.g = 0;
	color.b = Math.floor(255 - temperature*255);
	color.a = 1.0;

	return color;
}

// Get the next cell
PoolBoard.getNextCell = function(currentCellX, currentCellY, direction, sideCells)
{
    var nextCell = {x:currentCellX+direction.x, y:currentCellY+direction.y};
    
    // Wrap around
    if(nextCell.x >= sideCells)
        nextCell.x = 0;
    if(nextCell.x < 0)
        nextCell.x = sideCells - 1;
    if(nextCell.y >= sideCells)
        nextCell.y = 0;
    if(nextCell.y < 0)
        nextCell.y = sideCells - 1;
    
    return nextCell;
}

//**********************************************//
//					MAIN						//
//**********************************************//

var canvas = document.getElementById('poolCanvas'),
	context = canvas.getContext('2d');

var board = new PoolBoard();

Game.run();
//Game.initialize();

document.getElementById("runBtn").addEventListener("click", Game.initialize);
