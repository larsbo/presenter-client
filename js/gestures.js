$(document).ready(function(){
	var images = $('#image-container').find('.image');

	images.draggable({
		start: function() {
			/* publish 'drag start' if connected */
			if (sess && sess._websocket_connected) {
				publishDragStart($(this).attr('id'));
			}
		},
		drag: function() {
			/* publish current position if connected */
			if (sess && sess._websocket_connected) {
				var elem = $(this);
				var pos = elem.position();
				publishDrag(elem.attr('id'), pos.left, pos.top);
			}
		},
		containment: "parent",
		stack: "#image-container .image"
	});

});