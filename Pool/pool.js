var canvas = document.getElementById('poolCanvas'),
	context = canvas.getContext('2d');

var PoolBoard = {};

var Game = {};
Game.frame = 0;
Game.frameCount = 0;
Game.fps = 50;
Game.realFps = -1;

Game._intervalId = setInterval(Game.run, 1000 / Game.fps);

Game.initialize = function()
{
	var sideCells = document.getElementById("sideCellsTxt").value;
	var numPellets = document.getElementById("numPelletsTxt").value;
	var thermalCond = document.getElementById("thermalCondTxt").value;
	var pelletMass = document.getElementById("pelletMassTxt").value;
	var numHeatSources = document.getElementById("numHeatSourcesTxt").value;

	PoolBoard.sideCells = sideCells;
	PoolBoard.cellSize = canvas.width / PoolBoard.sideCells;
	PoolBoard.baseThermalConductivity = thermalCond;
	PoolBoard.numPellets = numPellets;
	PoolBoard.numHeatSources = numHeatSources;

	// Initialize cells
	PoolBoard.cells = [];
	for(var x = 0; x < PoolBoard.sideCells; x++)
	{
		PoolBoard.cells[x] = [];
		for(var y = 0; y < PoolBoard.sideCells; y++)
			PoolBoard.cells[x][y] = Math.random();
	}

	// Initialize pellets
	PoolBoard.PelletList = [];
	for( var p = 0; p < PoolBoard.numPellets; p++ )
	{
		PoolBoard.PelletList[p] = PoolBoard.Pellet(Math.random()*500, Math.random()*500, 2, pelletMass, (Math.random()*20-10)*0.01);
	}

	// Initialize sin heat sources
	PoolBoard.SinHeatSourceList = [];
	for( var s = 0; s < PoolBoard.numHeatSources; s++)
	{
		PoolBoard.SinHeatSourceList[s] = PoolBoard.SinHeatSource(Math.floor(Math.random()*PoolBoard.sideCells), 
										Math.floor(Math.random()*PoolBoard.sideCells), Math.random()*30 + 30);
	}
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
	PoolBoard.update();
};

Game.draw = function()
{
	context.fillStyle = 'white';
	context.clearRect(0, 0, canvas.width, canvas.height);

	PoolBoard.draw();

	Game.frame++; Game.frameCount++;

	context.fillStyle = 'black';
	context.font = 'italic 20pt Calibri';
	context.textAlign = 'right';
	context.textBaseline = 'top';
	context.fillText("FPS: " + Game.realFps, 490, 0);
	context.fillStyle = 'white';
	context.fillText("FPS: " + Game.realFps, 492, 2);
};

PoolBoard.draw = function() {
	// Draw each cell
	for(var x = 0; x < PoolBoard.sideCells; x++)
		for(var y = 0; y < PoolBoard.sideCells; y++)
		{
			var tempColor = PoolBoard.getTemperatureColor(PoolBoard.cells[x][y]);
			Game.setContextToColor(tempColor);
			context.fillRect(x*PoolBoard.cellSize, 
							y*PoolBoard.cellSize, 
				PoolBoard.cellSize, PoolBoard.cellSize);
		}

	context.fillStyle = 'black';
	for( var p = 0; p < PoolBoard.numPellets; p++ )
	{
		var pellet = PoolBoard.PelletList[p];
		context.fillRect(pellet.x+pellet.size/2, pellet.y+pellet.size/2, pellet.size, pellet.size);
	}
}

var count = 0;

PoolBoard.Pellet = function(x, y, size, mass, heatContribution)
{
	var pellet = {};
	pellet.x = x;
	pellet.y = y;
    pellet.heatContribution = heatContribution;
	pellet.size = size;
	pellet.mass = mass;

	return pellet;
}

PoolBoard.SinHeatSource = function(x, y, period)
{
	var SinHeatSource = {};
	SinHeatSource.x = x; SinHeatSource.y = y;
	SinHeatSource.period = period;

	return SinHeatSource;
}

PoolBoard.update = function() {
	var cellChanges = [];
	var cells = PoolBoard.cells;
	var cellFlowX = [];
	var cellFlowY = [];
    
    // Do nothing if not initialized
	if(cells === undefined || cells[0] === undefined) return;
    
    // Calculate all cells temperature change
	for(var x = 0; x < PoolBoard.sideCells; x++)
	{
		cellChanges[x] = [];
		cellFlowX[x] = [];
		cellFlowY[x] = [];
		for(var y = 0; y < PoolBoard.sideCells; y++)
		{
			cellChanges[x][y] = 0.0;
			cellFlowX[x][y] = 0.0;
			cellFlowY[x][y] = 0.0;
            
            for(var dir = 0; dir < PoolBoard.DIRECTIONS.length; dir++)
            {
                var direction = PoolBoard.DIRECTIONS[dir];
                
                var nextCell = PoolBoard.getNextCell(x,y,direction);
                
                var change = PoolBoard.getTemperatureChange(cells[x][y], cells[nextCell.x][nextCell.y]);
                cellChanges[x][y] += change;
                // positive change means heat is coming from there, so cellFlow is in the opposite direction
                cellFlowX[x][y] += -change*direction.x; // direction.x will be 0 when y != 0
                cellFlowY[x][y] += -change*direction.y; // direction.x will be 0 when x != 0
                
            }
		}
	}

    // Apply temperature change
	for(var x = 0; x < PoolBoard.sideCells; x++)
		for(var y = 0; y < PoolBoard.sideCells; y++)
			if(Math.abs(cellChanges[x][y]) > 0.000001)
			{
				count++;
				cells[x][y] += cellChanges[x][y];
                
                // Cap temperature at 1.0 and 0.0
                if(cells[x][y] > 1.0) cells[x][y] = 1.0;
			    if(cells[x][y] < 0.0) cells[x][y] = 0.0;
			}

    // Simulate all heat sources changing through time
	for(var s = 0; s < PoolBoard.numHeatSources; s++)
	{
		var heatSource = PoolBoard.SinHeatSourceList[s];
		cells[heatSource.x][heatSource.y] = Math.sin(Game.frameCount/heatSource.period);
	}

    // Update the pellets
	for( var p = 0; p < PoolBoard.numPellets; p++ )
	{
		var pellet = PoolBoard.PelletList[p];
		
        // Get the cell for the current pellet
		var cellX = Math.floor(pellet.x / PoolBoard.cellSize);
		var cellY = Math.floor(pellet.y / PoolBoard.cellSize);

        // Just in case a pellet is outside the board
		if(cellX >= PoolBoard.sideCells) cellX = PoolBoard.sideCells - 1;
		if(cellX < 0) cellX = 0;
		if(cellY >= PoolBoard.sideCells) cellY = PoolBoard.sideCells -1;
		if(cellY < 0) cellY = 0;

        // Calculate the velocity of the pellet based on the current cells flow
		var velX = cellFlowX[cellX][cellY]*(10000/pellet.mass);
		var velY = cellFlowY[cellX][cellY]*(10000/pellet.mass);

		// Check for collisions
		// TODO: Partition collisions by cell
		for( var pi = 0; pi < PoolBoard.numPellets; pi++ )
		{
			// dont try to collide with itself
			if(pi == p) continue;

			var pelletP = PoolBoard.PelletList[pi];

			var dist = PoolBoard.getSqrdDistance(pellet.x + velX, pellet.y + velY,
												pelletP.x, pelletP.y);

			if(dist < (pelletP.size + pellet.size)*(pelletP.size + pellet.size) )
			{

				// binary search the right multiplier
				var vML = 0.0; // vel multiplier low
				var vMH = 1.0; // vel multiplier high

				while(Math.abs(vML - vMH) > 0.0001)
				{
					var midVelX = (vMH+vML)/2*velX;
					var midVelY = (vMH+vML)/2*velY;

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

				velX = velX*vML;
				velY = velY*vML;
			}
		}

        // Update position
		pellet.x += velX;
		pellet.y += velY;

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
}

// Temp1 temp2 from 0 to 1.0
PoolBoard.getTemperatureChange = function(sourceTemp, targetTemp)
{
	count++;
	return (targetTemp - sourceTemp)*PoolBoard.baseThermalConductivity;
}

PoolBoard.getSqrdDistance = function(pellet1X, pellet1Y, pellet2X, pellet2Y)
{
	var distX = pellet1X - pellet2X;
	var distY = pellet1Y - pellet2Y;
	return distX*distX + distY*distY;
}

// From 0 to 255 {r g b a}
Game.setContextToColor = function(tempColor)
{
	context.fillStyle = "rgba("+tempColor.r+","+tempColor.g+","
								+tempColor.b+","+tempColor.a+")";
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

// Directions (0 - up, 1 - left, 2 - down, 3 - right)
PoolBoard.DIRECTIONS = [{x:0,y:-1},{x:-1,y:0},{x:0,y:1},{x:1,y:0}];
// Get the next cell
PoolBoard.getNextCell = function(currentCellX, currentCellY, direction)
{
    var nextCell = {x:currentCellX+direction.x, y:currentCellY+direction.y};
    
    // Wrap around
    if(nextCell.x >= PoolBoard.sideCells)
        nextCell.x = 0;
    if(nextCell.x < 0)
        nextCell.x = PoolBoard.sideCells - 1;
    if(nextCell.y >= PoolBoard.sideCells)
        nextCell.y = 0;
    if(nextCell.y < 0)
        nextCell.y = PoolBoard.sideCells - 1;
    
    return nextCell;
}

Game.run();
//Game.initialize();
document.getElementById("runBtn").addEventListener("click", Game.initialize);