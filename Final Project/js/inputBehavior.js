var previousShield = -1;

var mouseVelX = 0;
var mouseVelY = 0;

function onDocumentMouseMove( event ) 
{
    if( mouse.x != undefined && mouse.y != undefined )
    {
        mouseVelX = mouse.x - (( event.clientX / window.innerWidth ) * 2 - 1);
        mouseVelY = mouse.y - ( - ( event.clientY / window.innerHeight ) * 2 + 1);
    }
    
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;   
    
    
    if( !mouseDown )
    {    
        // update the picking ray with the camera and mouse position	
        raycaster.setFromCamera( mouse, camera );
        raycaster.far = Infinity;

        // calculate objects intersecting the picking ray
        var intersects = raycaster.intersectObjects( [defenseSphere] );

        if( intersects.length > 0 )
        {
            var index = calculateShield( defenseSphere.geometry, intersects[0].face );
            
            // Hover effect if it has not been clicked
            if( shields[index].shieldType == -1 )
                changeDefenseAppearance( index, 1 );

            // Return the previous shield to the default appearance if it has not been clicked
            if( previousShield != -1 && previousShield != index && shields[previousShield].shieldType == -1 )
                changeDefenseAppearance( previousShield, 0 );

            previousShield = index;
        }
        else if( previousShield != -1 )
        {
            if( previousShield != -1 && shields[previousShield].shieldType == -1 )
                changeDefenseAppearance( previousShield, 0 );

            previousShield = -1;
        }
    }
    
    // Move the defense when it has to be done
    if( movingDefense )
    {
        defenseSphere.rotation.y -= mouseVelX*0.7;
        defenseSphere.rotation.z -= mouseVelY*0.7;
        planetSphere.rotation.y -= mouseVelX*0.7;
        planetSphere.rotation.z -= mouseVelY*0.7;
    }
}


var mouseDown = false;
var movingDefense = false;
var mouseDownX = -1;
var mouseDownY = -1;
function onDocumentMouseDown( event ) 
{
    mouseDown = true;
    
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    mouseDownX = mouse.x;
    mouseDownY = mouse.y;
    
    // update the picking ray with the camera and mouse position	
    raycaster.setFromCamera( mouse, camera );
    raycaster.far = Infinity;

    // calculate objects intersecting the picking ray
    var intersects = raycaster.intersectObjects( [defenseSphere] );

    if( intersects.length > 0 )
    {
        movingDefense = true;
        return;
    }
    
    cameraController.Start();
//
//    if( intersects.length > 0 )
//        {                        
//            extrudeFaceInsideSphere( intersects[0].face.a, planetSphere.geometry, 2, planetSphere.position );
//            extrudeFaceInsideSphere( intersects[0].face.b, planetSphere.geometry, 2, planetSphere.position );
//            extrudeFaceInsideSphere( intersects[0].face.c, planetSphere.geometry, 2, planetSphere.position );
//        }

//                    for( var i = 0; i < planetSphere.geometry.vertices.length; i++ )
//                    {                        
//                        //var v = planetSphere.geometry.vertices[i].clone();
//                        //v.add( sPosition );
//                        //v.normalize();
//                        var r = Math.random()*0.5 - 0.25;
//                        
//                        planetSphere.geometry.vertices[i].x -= planetSphere.geometry.vertices[i].normalv.x*r;
//                        planetSphere.geometry.vertices[i].y -= v.y*r;
//                        planetSphere.geometry.vertices[i].z -= v.z*r;
//                    }

//    planetSphere.geometry.verticesNeedUpdate = true;
//    planetSphere.geometry.normalsNeedUpdate = true;

    /* Compute normals 
    planetSphere.geometry.computeFaceNormals();
    planetSphere.geometry.computeVertexNormals();*/
}

function onDocumentMouseUp( event )
{
    cameraController.Stop();
    movingDefense = false;
    
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    
    if( mouseDownX == mouse.x && mouseDownY == mouse.y )
    {

        // update the picking ray with the camera and mouse position	
        raycaster.setFromCamera( mouse, camera );
        raycaster.far = Infinity;

        // calculate objects intersecting the picking ray
        var intersects = raycaster.intersectObjects( [defenseSphere] );

        if( intersects.length > 0 )
        {
            var index = calculateShield( defenseSphere.geometry, intersects[0].face );

            if(shields[index].shieldType == -1 )
            {
                // Game logic
                shields[index].shieldType = 0;

                // Rendering
                changeDefenseAppearance( index, 2 );
            }
        }
    }
    
    mouseDown = false;
}