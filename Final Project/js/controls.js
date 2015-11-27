var Utils = {};
var Controls = {};

// Calculates brick position and 
Utils.GetXGlobalPositionfromLocal = function( originX, originY, localX, localY, axisAngle )
{
    return originX + localX*Math.cos( axisAngle ) - localY*Math.sin( axisAngle );
}

Utils.GetYGlobalPositionfromLocal = function( originX, originY, localX, localY, axisAngle )
{
    return originY + localX*Math.sin( axisAngle ) + localY*Math.cos( axisAngle );
}

Controls.PlanetCameraRotationController = function ( camera )
{
    var enabled = false;
    
    var controlAngleHorizontal = 0
    var controlAngleVertical = 0;
    
    var distanceFromCenter = 100;
    var targetCamera = camera;
    
    this.UpdateCameraPosition = function()
    {
        if( controlAngleVertical > Math.PI / 2 - 0.1 )
            controlAngleVertical = Math.PI / 2 - 0.1;
        if( controlAngleVertical < -Math.PI / 2 + 0.1 )
            controlAngleVertical = -Math.PI / 2 + 0.1;
        
        var circleRadius = distanceFromCenter*Math.cos( controlAngleVertical );    

        targetCamera.position.x = Utils.GetXGlobalPositionfromLocal( 0, 0, circleRadius, 0, controlAngleHorizontal );
        targetCamera.position.z = Utils.GetYGlobalPositionfromLocal( 0, 0, circleRadius, 0, controlAngleHorizontal );
        targetCamera.position.y = distanceFromCenter*Math.sin( controlAngleVertical );
    };
    
    this.Start = function () { enabled = true; };
    this.Stop = function () { enabled = false; };

    var onMouseMove = function ( event ) 
    {        
        if( enabled === false ) return;        
        
        var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        controlAngleHorizontal += movementX * 0.002;
        controlAngleVertical  += movementY * 0.002;
        
        //console.log( 'h: ' + controlAngleHorizontal + ' v: ' + controlAngleVertical );
    };
    
    document.addEventListener( 'mousemove', onMouseMove, false );
}