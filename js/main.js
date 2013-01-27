$(document).ready(function(){

	// disable image dragging in desktop browsers
	//$('img').bind('dragstart', function(event) { event.preventDefault(); });

	// disable drag scrolling in mobile browsers
	document.body.addEventListener('touchmove', function(event) {
		event.preventDefault();
	}, false);

	// background changer
	var bg_changer = $('#backgroundChanger');
	bg_changer.imagepicker();
	bg_changer.change(function(){
		var bg = $(this).val();
		$('body').css('background-image', 'url(img/bg/background-' + bg + '.jpg)');
	}).change();

});