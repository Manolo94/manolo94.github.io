function Asteroid( size, color, velocity ) {
    
  var colorValue, material, asteroid, texture, geometry, particleSystem, options, spawnerOptions, light;
  
  spawnerOptions = {
        spawnRate: 3000,
        velocity: velocity,
        timeScale: 1
  }  
  //color of the asteroid
  switch( color ) {
      case 'ice':
          this.type = 0;
          colorValue = 0x56C1DC;
          light = new THREE.PointLight(0x0000ff, 20, 100);                                
      break;
      case 'fire':
          this.type = 1;
          colorValue = 0xEA3500;
          light = new THREE.PointLight(0xff0000, 20, 100);                             
      break;
      default:
          this.type = 2;
          colorValue = 0xBA55D3;
          light = new THREE.PointLight(0x1111ff, 20, 180);
      break;        
  }
  //keep maxParticles between 10000 and 100000      
  particleSystem = new THREE.GPUParticleSystem( { maxParticles: 10000 } );
        
  options = {
                position: new THREE.Vector3(),
                positionRandomness: 1,
                velocity: velocity,
                velocityRandomness: 0.2,
                color: colorValue,
                colorRandomness: .2,
                turbulence: .15,
                lifetime: 1,
                size: size,
                sizeRandomness: 1
            };
        
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
        
  //setters. 
  //Maybe, we could add rotation x, y, and z 
  //separately instead of rotating through every axis
  this.positionX = function( value ){
    options.position.x = value;
    this.asteroid.position.x = value;
    light.position.x = value;
  }
    
  this.positionY = function( value ){
    options.position.y = value;
    this.asteroid.position.y = value;
      light.position.y = value;
  }
      
  this.positionZ = function( value ){
    options.position.z = value;
    this.asteroid.position.z = value;
    light.position.z = value;
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
  this.update = function(deltaTime)
  {
      this.positionX( this.asteroid.position.x + options.velocity.x*deltaTime );
      this.positionY( this.asteroid.position.y + options.velocity.y*deltaTime );
      this.positionZ( this.asteroid.position.z + options.velocity.z*deltaTime );
  }
  
  this.partSystem = particleSystem;
  this.option = options;
  this.spawnOptions = spawnerOptions;
    
  this.addToScene = function()
  {
      scene.add( particleSystem );
      scene.add( this.asteroid );
  }
    
  this.remove = function()
  {
      scene.remove(this.asteroid);
      scene.remove(particleSystem);
  }
}