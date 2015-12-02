var previousShield = -1;

function onDocumentMouseMove( event ) 
{
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
            if( shields[index].shieldType == -1 ){
                var ghost = getGhostShield();
                
                if(ghost !== undefined){
                    changeDefenseAppearance( index, ghost );
                }              
            }             
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
}

function getGhostShield(){
    if(currentShieldSelected !== undefined)
    {
        switch(currentShieldSelected)
        {
            case 'blue':
                return 1;
                break;
            case 'red':
                return 4;
                break;
            default:
                return 6;
                break;               
        }
    }
}

function getShield(){
    if(currentShieldSelected !== undefined)
    {
        switch(currentShieldSelected)
        {
            case 'blue':
                return {material: 2, type: 0};
                break;
            case 'red':
                return {material: 3, type: 1};
                break;
            default:
                return {material: 5, type: 2};
                break;               
        }
    }
}

var mouseDown = false;
var mouseDownX = -1;
var mouseDownY = -1;
function onDocumentMouseDown( event ) 
{
    mouseDown = true;
    
    cameraController.Start();
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    mouseDownX = mouse.x;
    mouseDownY = mouse.y;

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
                var shield = getShield();
                
                if(shield !== undefined)
                {
                    // Game logic
                    shields[index].shieldType = shield.type;

                    // Rendering
                    changeDefenseAppearance( index, shield.material ); 
                }         
            }
        }
    }
    
    mouseDown = false;
}