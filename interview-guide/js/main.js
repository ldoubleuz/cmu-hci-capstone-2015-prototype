$(document).ready(function() {
    $('.scroll-button.up').click(function() {
        $(this).parent()[0].scrollTop -= 200;
    });

    $('.scroll-button.down').click(function() {
        $(this).parent()[0].scrollTop += 200;
    });
});