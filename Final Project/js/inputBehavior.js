var previousShield = -1;

function onDocumentMouseMove( event ) 
{
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    
    // update the picking ray with the camera and mouse position	
    raycaster.setFromCamera( mouse, camera );	

    // calculate objects intersecting the picking ray
    var intersects = raycaster.intersectObjects( [defenseSphere] );
    
    if( intersects.length > 0 )
    {
        var index = calculateShield( defenseSphere.geometry, intersects[0].face );
        
        changeDefenseAppearance( index, 1 );
        
        if( previousShield != -1 && previousShield != index )
            changeDefenseAppearance( previousShield, 0 );
        
        previousShield = index;
    }
    else if( previousShield != -1 && previousShield != index )
    {
        if( previousShield != -1 && previousShield != index )
            changeDefenseAppearance( previousShield, 0 );
        
        previousShield = -1;
    }
    
}

function onDocumentMouseDown( event ) 
{
    cameraController.Start();
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    // update the picking ray with the camera and mouse position	
    raycaster.setFromCamera( mouse, camera );	

    // calculate objects intersecting the picking ray
    var intersects = raycaster.intersectObjects( [defenseSphere] );
    
    if( intersects.length > 0 )
    {
        var index = calculateShield( defenseSphere.geometry, intersects[0].face );
        
        changeDefenseAppearance( index, 2 );
    }

    /*if( intersects.length > 0 )
        {                        
            extrudeFaceInsideSphere( intersects[0].face.a, planetSphere.geometry, 2, planetSphere.position );
            extrudeFaceInsideSphere( intersects[0].face.b, planetSphere.geometry, 2, planetSphere.position );
            extrudeFaceInsideSphere( intersects[0].face.c, planetSphere.geometry, 2, planetSphere.position );
        }

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

    planetSphere.geometry.verticesNeedUpdate = true;
    planetSphere.geometry.normalsNeedUpdate = true;

    /* Compute normals 
    planetSphere.geometry.computeFaceNormals();
    planetSphere.geometry.computeVertexNormals();*/
}

function onDocumentMouseUp( event )
{
    cameraController.Stop();
}