jQuery(document).ready(function($) {
	$('img.photo-thumb').click(function() {
		if ( ! $(this).hasClass('active') ) {
			$('#main_photo img').attr('src',$(this).attr('src'));		
			$('img.photo-thumb.active').removeClass('active');
			$(this).addClass('active');
		}
	});
});