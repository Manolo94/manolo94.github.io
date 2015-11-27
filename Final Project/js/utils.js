function updateSize()
{
    if( windowWidth != window.innerWidth || windowHeight != window.innerHeight )
    {
        windowWidth = window.innerWidth;
        windowHeight = window.innerHeight;

        renderer.setSize( windowWidth, windowHeight );
    }
}