var currentShieldSelected;
var planetSelected;
var difficultySelected;
var stardustScoreElement;

$(document).ready(function(){

    stardustScoreElement = $('#scoreValue');

    $('a').tooltip();

    $(".shield").on('click', function() {
     var height = $(this).css('height');
     var width = $(this).css('width');

     if(height === '50px'){
        $(this).css('height', '70');
        $(this).css('width', '65');
        currentShieldSelected = $(this).attr('id');

        $('.shield').each(function(idx, el){
            if($(this).attr('id') !== currentShieldSelected){
                $(this).css('height', '50');
                $(this).css('width', '45');
            }
        });   

     } else{
        $(this).css('height', '50');
        $(this).css('width', '45');

        currentShieldSelected = undefined;
     }                 
    });

    $(".planet").on('click', function() {


         var height = $(this).css('height');
         var width = $(this).css('width');

         if(height === '50px'){
            $(this).css('height', '70');
            $(this).css('width', '65');
            planetSelected = $(this).attr('id');

            $('.planet').each(function(idx, el){
                if($(this).attr('id') !== planetSelected){
                    $(this).css('height', '50');
                    $(this).css('width', '45');
                }
            });   

         } else{
            $(this).css('height', '50');
            $(this).css('width', '45');

            planetSelected = undefined;
         }       

    });

    $(".difficulty").on('click', function() {


         var height = $(this).css('height');
         var width = $(this).css('width');

         if(height === '50px'){
            $(this).css('height', '70');
            $(this).css('width', '65');
            difficultySelected = $(this).attr('id');

            $('.difficulty').each(function(idx, el){
                if($(this).attr('id') !== difficultySelected){
                    $(this).css('height', '50');
                    $(this).css('width', '45');
                }
            });   

         } else{
            $(this).css('height', '50');
            $(this).css('width', '45');

            difficultySelected = undefined;
         }       

    });


    $("#menuButton").on('click', function(){
        location.reload();
    });

    $("#playButton").on('click', function(){
        if(planetSelected === undefined || difficultySelected === undefined){
            location.reload();
        }else{
            init();
        }                
    });
});