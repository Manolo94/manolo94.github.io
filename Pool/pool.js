console.log("Test test test");

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


	PoolBoard.sideCells = sideCells;
	PoolBoard.cellSize = canvas.width / PoolBoard.sideCells;
	PoolBoard.baseThermalConductivity = thermalCond;
	PoolBoard.numPellets = numPellets;

	PoolBoard.cells = [];
	for(var x = 0; x < PoolBoard.sideCells; x++)
	{
		PoolBoard.cells[x] = [];
		for(var y = 0; y < PoolBoard.sideCells; y++)
			PoolBoard.cells[x][y] = Math.random();
	}

	PoolBoard.PelletList = [];
	for( var p = 0; p < PoolBoard.numPellets; p++ )
	{
		PoolBoard.PelletList[p] = PoolBoard.Pellet(Math.random()*500, Math.random()*500, 2, pelletMass);
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

PoolBoard.Pellet = function(x, y, size, mass)
{
	var pellet = {};
	pellet.x = x;
	pellet.y = y;
	pellet.size = size;
	pellet.mass = mass;

	return pellet;
}

PoolBoard.update = function() {
	var cellChanges = [];
	var cells = PoolBoard.cells;
	var cellChangesX = [];
	var cellChangesY = [];
	for(var x = 0; x < PoolBoard.sideCells; x++)
	{
		cellChanges[x] = [];
		cellChangesX[x] = [];
		cellChangesY[x] = [];
		for(var y = 0; y < PoolBoard.sideCells; y++)
		{
			cellChanges[x][y] = 0.0;
			cellChangesX[x][y] = 0.0;
			cellChangesY[x][y] = 0.0;
			if(x+1 < PoolBoard.sideCells)
			{
				var change = PoolBoard.getTemperatureChange(cells[x][y], cells[x+1][y]);
				cellChanges[x][y] += change;
				// positive change, temperature coming from right --> pushes left
				cellChangesX[x][y] += -change;
			}
			if(y-1 >= 0)
			{
				var change = PoolBoard.getTemperatureChange(cells[x][y], cells[x][y-1]);
				cellChanges[x][y] += change;
				// positive change, temperature coming from top --> pushes down
				cellChangesY[x][y] += change;
			}
			if(x-1 >= 0)
			{
				var change = PoolBoard.getTemperatureChange(cells[x][y], cells[x-1][y]);
				cellChanges[x][y] += change;
				// positive change, temperature coming from left --> pushes right
				cellChangesX[x][y] += change;
			}
			if(y+1 < PoolBoard.sideCells)
			{
				var change = PoolBoard.getTemperatureChange(cells[x][y], cells[x][y+1]);
				cellChanges[x][y] += change;
				// positive change, temperature coming from bottom --> pushes up
				cellChangesY[x][y] += -change;
			}
		}
	}

	for(var x = 0; x < PoolBoard.sideCells; x++)
		for(var y = 0; y < PoolBoard.sideCells; y++)
			if(Math.abs(cellChanges[x][y]) > 0.000001)
			{
				count++;
				cells[x][y] += cellChanges[x][y];
			}

	for(var x = 0; x < PoolBoard.sideCells; x++)
		cells[5][5] += Math.sin(Game.frameCount/60)*0.2;

	for(var x = 0; x < PoolBoard.sideCells; x++)
		cells[8][8] += Math.abs(Math.sin(Game.frameCount))*0.2;

	for(var x = 0; x < PoolBoard.sideCells; x++)
		for(var y = 0; y < PoolBoard.sideCells; y++)
		{
			if(cells[x][y] > 1.0) cells[x][y] = 1.0;
			if(cells[x][y] < 0.0) cells[x][y] = 0.0;
		}

	for( var p = 0; p < PoolBoard.numPellets; p++ )
	{
		var pellet = PoolBoard.PelletList[p];
		// Pellet update
		var cellX = Math.floor(pellet.x / PoolBoard.cellSize);
		var cellY = Math.floor(pellet.y / PoolBoard.cellSize);

		if(cellX >= PoolBoard.sideCells) cellX = PoolBoard.sideCells - 1;
		if(cellX < 0) cellX = 0;
		if(cellY >= PoolBoard.sideCells) cellY = PoolBoard.sideCells -1;
		if(cellY < 0) cellY = 0;

		pellet.x += cellChangesX[cellX][cellY]*(10000/pellet.mass);
		pellet.y += cellChangesY[cellX][cellY]*(10000/pellet.mass);
	}
}

// Temp1 temp2 from 0 to 1.0
PoolBoard.getTemperatureChange = function(sourceTemp, targetTemp)
{
	count++;
	return (targetTemp - sourceTemp)*PoolBoard.baseThermalConductivity;
}

// From 0 to 255
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

Game.run();
//Game.initialize();
document.getElementById("runBtn").addEventListener("click", Game.initialize);