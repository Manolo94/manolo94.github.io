var resources = 0;
var grid;
var enemyBuildable;

var ATTACKER_RANGE = 2;

// Building 1 - collector, 2 - defense, 3 - attack
// cost
var costs = [];
costs[1] = 100;
costs[2] = 150;
costs[3] = 100;
costs[4] = 0;
// life
var life = [];
life[1] = 50;
life[2] = 400;
life[3] = 100;
life[4] = 1000;

onmessage = function(e)
{
    //console.log( 'message Received' );
    if( e.data.type == 'init' )
        self.postMessage( { 'type' : 'response' , 'value' : e.data.value + 10 } );
    
    if( e.data.type == 'statusUpdate' )
    {
        resources = e.data.resources;
        grid = e.data.grid;
        enemyBuildable = e.data.enemyBuildable;
        
        // Attack anything that can be attacked
        for( var j = 0; j < enemyBuildable.length; j++ )
        {
            for ( var i = 0; i < enemyBuildable[j].length; i++ )
            {
                // Check that is an attacker building that belongs to it
                if( grid[i][j].charAt(0) == 'b' 
                   && grid[i][j].charAt(1) == 'a' && grid[i][j].charAt(2) == 'e' )
                {
                    // Go through every cell in the game grid
                    for( var gj = 0; gj < enemyBuildable.length; gj++ )
                    {
                        for ( var gi = 0; gi < enemyBuildable[gj].length; gi++ )
                        {
                            // If it is a player building and in reach, ATTACK IT!!!
                            if( grid[gi][gj].charAt(2) == 'p' && Math.abs( j - gj ) + Math.abs( i - gi ) <= ATTACKER_RANGE )
                            {
                                pausecomp( 500 );
                                self.postMessage( { 'type' : 'attack' , 'originI' : i, 'originJ' : j, 'destI' : gi, 'destJ' : gj } );
                                return;
                            }
                        }
                    }
                }
            }
        }
        
        setTimeout( checkResource, Math.floor( Math.random() * 1000 ) );
    }
}

function checkResource()
{
    for( var j = 0; j < enemyBuildable.length; j++ )
    {
        for ( var i = 0; i < enemyBuildable[j].length; i++ )
        {                
            if( enemyBuildable[i][j] == true && grid[i][j].charAt(0) == 'r' && resources >= costs[1] )
            {
                // Put a collector if we found a buildable tile that has a resource
                //console.log( "Build collector" );
                self.postMessage( { 'type' : 'build' , 'posI' : i, 'posJ' : j, bType : 1 } );
                return;
            }
        }
    }
    
    setTimeout( putAttackBuilding, Math.floor( Math.random() * 1000 ) );
    setTimeout( putRandomBuilding, Math.floor( Math.random() * 1000 ) );
}

function putAttackBuilding()
{
    var closeI = 0;
    var closeJ = 0;
    var closestDist = 999;
    for( var j = 0; j < enemyBuildable.length; j++ )
    {
        for ( var i = 0; i < enemyBuildable[j].length; i++ )
        {
            if( enemyBuildable[i][j] && grid[i][j] == "00" )
            {               
                for( var gj = 0; gj < enemyBuildable.length; gj++ )
                {
                    for ( var gi = 0; gi < enemyBuildable[gj].length; gi++ )
                    {
                        if( grid[gi][gj].charAt(0) == 'b' && grid[gi][gj].charAt(2) == 'p' && grid[gi][gj].charAt(1) == 'C' )
                        {
                            // Calculate the distance, using manhattan heuristic
                            dist = Math.abs( j - gj ) + Math.abs( i - gi );
                            
                            if( dist < closestDist )
                            {
                                closeI = i;
                                closeJ = j;
                                closestDist = dist;
                            }
                        }
                    }
                }
            }
        }
    }
    self.postMessage( { 'type' : 'build' , 'posI' : closeI, 'posJ' : closeJ, bType : 3 } );
}

function putRandomBuilding()
{
    for( var j = 0; j < enemyBuildable.length; j++ )
    {
        for ( var i = 0; i < enemyBuildable[j].length; i++ )
        {
            if( enemyBuildable[i][j] == true && resources >= costs[1] )
            {
                var num = Math.floor( Math.random() * 6 );

                if( num == 1 )
                {
                    // Put a collector if we found a buildable tile that has a resource
                    //console.log( "Build collector" );
                    self.postMessage( { 'type' : 'build' , 'posI' : i, 'posJ' : j, bType : 1 } );
                    return;
                }
            }
            if( enemyBuildable[i][j] == true && resources >= costs[2] )
            {                
                num = Math.floor( Math.random() * 20 );

                if( num == 1 )
                {
                    // Put a collector if we found a buildable tile that has a resource
                    //console.log( "Build collector" );
                    self.postMessage( { 'type' : 'build' , 'posI' : i, 'posJ' : j, bType : 2 } );
                    return;
                }
            }
        }
    }
}

function pausecomp(millis)
{
      var date = new Date();
      var curDate = null;
      do { curDate = new Date(); }
      while(curDate-date < millis);
}