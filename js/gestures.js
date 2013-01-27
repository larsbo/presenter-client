$(document).ready(function(){
	var images = $('#image-container').find('img');

	images.draggable({
		start: function() {
			$.meow({message: 'drag start!'});
		},
		drag: function() {
			var elem = $(this);
			var pos = elem.position();
			//console.log(pos.left + ':' + pos.top);
			updatePosition(elem, pos.left, pos.top);
		},
		stack: "#image-container img"
	});
});