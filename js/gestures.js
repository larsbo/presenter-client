$(document).ready(function(){
	var images = $('#image-container').find('.image');

	images.draggable({
		start: function() {
			/* publish 'drag start' if connected */
			if (sess) {
				publishDragStart($(this).attr('id'));
			}
		},
		drag: function() {
			/* publish current position if connected */
			if (sess) {
				var elem = $(this);
				var pos = elem.position();
				publishDrag(elem.attr('id'), pos.left, pos.top);
			}
		},
		stack: "#image-container .image"
	});

});