function Asteroid( size, color, horizontalSpeed, verticalSpeed ) {
    
  var colorValue, material, asteroid, texture, geometry, particleSystem, options, spawnerOptions;
  
  spawnerOptions = {
        spawnRate: 15000,
        horizontalSpeed: horizontalSpeed,
        verticalSpeed: verticalSpeed,
        timeScale: 1
  }  
  //color of the asteroid
  switch( color ) {
      case 'ice':
          colorValue = 0x56C1DC;
      break;
      case 'fire':
          colorValue = 0xEA3500;
      break;
      default:
          colorValue = 0xBA55D3;
      break;        
  }
  //keep maxParticles between 10000 and 100000      
  particleSystem = new THREE.GPUParticleSystem( { maxParticles: 10000 } );
        
  options = {
                position: new THREE.Vector3(),
                positionRandomness: 1,
                velocity: new THREE.Vector3(),
                velocityRandomness: 1,
                color: colorValue,
                colorRandomness: .2,
                turbulence: .15,
                lifetime: 1,
                size: size,
                sizeRandomness: 1
            };
        
  scene.add( particleSystem );
        
  geometry = new THREE.IcosahedronGeometry( size, size );
     
  switch( colorValue ) {
      case 0x56C1DC:
          texture = THREE.ImageUtils.loadTexture( 'images/Blue.jpg' );
      break;
      case 0xEA3500:
          texture = THREE.ImageUtils.loadTexture( 'images/Fire.jpg' );
      break;
      default:
          texture = THREE.ImageUtils.loadTexture( 'images/Nova.jpg' );
      break;
  }
          
  material = new THREE.ShaderMaterial( {
                       uniforms: { 
                       tExplosion: { 
                       type: "t", 
                       value: texture
                       },
                       time: { 
                       type: "f", 
                       value: 0.0 
                       }
                       },
                       vertexShader: document.getElementById( 'asteroidVertexShader' ).textContent,
                       fragmentShader: document.getElementById( 'asteroidFragmentShader' ).textContent
                       });
        
  this.asteroid = new THREE.Mesh( geometry, material );
  this.asteroid.castShadow = true;
  this.asteroid.position = new THREE.Vector3( 0, 0, 0 ); 
  scene.add( this.asteroid );
        
  //setters. 
  //Maybe, we could add rotation x, y, and z 
  //separately instead of rotating through every axis
  this.positionX = function( value ){
    options.position.x = value;
    this.asteroid.position.x = value;
  }
    
  this.positionY = function( value ){
    options.position.y = value;
    this.asteroid.position.y = value;
  }
      
  this.positionZ = function( value ){
    options.position.z = value;
    this.asteroid.position.z = value;
  }
       
  this.rotationXYZ = function( value ){
    this.asteroid.rotation.x += value;
    this.asteroid.rotation.y += value;
    this.asteroid.rotation.z += value;
  }
  
  this.horizontalSpeed = function( value ){
      spawnerOptions.horizontalSpeed = value;
  }
  
  this.verticalSpeed = function( value ){
      spawnerOptions.verticalSpeed = value;
  }
  
  this.normalize = function(){
      options.position.normalize;
      this.asteroid.position.normalize;
  }
  
  this.multiplyScalar = function( value ){
      options.position.multiplyScalar( value );
      this.asteroid.position.multiplyScalar( value );
  }    
  this.partSystem = particleSystem;
  this.option = options;
  this.spawnOptions = spawnerOptions;     
}