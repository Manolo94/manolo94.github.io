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

Controls.FirstPersonCameraRotationController = function ( camera, targetScene )
{
    var enabled = false;
    
    var controlAngleHorizontal = 0
    var controlAngleVertical = 0;
    
    var distanceFromCamera = 1;
    var targetCamera = camera;
    var referenceObject = new THREE.Object3D();   
    
    targetScene.add( referenceObject );
    
    this.Update = function()
    {        
        if( controlAngleVertical > Math.PI / 2 - 0.1 )
            controlAngleVertical = Math.PI / 2 - 0.1;
        if( controlAngleVertical < -Math.PI / 2 + 0.1 )
            controlAngleVertical = -Math.PI / 2 + 0.1;
        
        var circleRadius = distanceFromCamera*Math.cos( controlAngleVertical );    

        referenceObject.position.x = Utils.GetXGlobalPositionfromLocal( targetCamera.position.x, targetCamera.position.y, circleRadius, 0, controlAngleHorizontal );
        referenceObject.position.y = Utils.GetYGlobalPositionfromLocal( targetCamera.position.x, targetCamera.position.y, circleRadius, 0, controlAngleHorizontal );       

        referenceObject.position.z = distanceFromCamera*Math.sin( controlAngleVertical ) + targetCamera.position.z;
        
        flashlight.target = referenceObject;
        
        targetCamera.lookAt( referenceObject.position );
    };
    
    this.GetFacingDirection = function()
    {
        var parallelToFloorX = Utils.GetXGlobalPositionfromLocal( targetCamera.position.x, targetCamera.position.y, distanceFromCamera, 0, controlAngleHorizontal );
        var parallelToFloorY = Utils.GetYGlobalPositionfromLocal( targetCamera.position.x, targetCamera.position.y, distanceFromCamera, 0, controlAngleHorizontal );
        
        var cameraVector = camera.position.clone();
        
        var resultingVector = new THREE.Vector3( parallelToFloorX, parallelToFloorY, cameraVector.z);
        
        cameraVector.negate();

        resultingVector.add( cameraVector );
        resultingVector.normalize();
        
        return resultingVector;
    }
    
    this.Start = function () { enabled = true; };
    this.Stop = function () { enabled = false; };

    var onMouseMove = function ( event ) 
    {
        if( enabled === false ) return;        
        
        var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        controlAngleHorizontal -= movementX * 0.002;
        controlAngleVertical  -= movementY * 0.002;
    };
    
    document.addEventListener( 'mousemove', onMouseMove, false );
}