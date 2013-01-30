$(document).ready(function(){
	var imageContainer = $('#image-container');
	var uploadInput = $('#upload-input');
	var backgroundChanger = $('#background-changer');
	var fileContainer = $('#file-container');
	var notifyContainer = $('.top-right');
	var imageCounter = imageContainer.find('.image').length;

	// disable image dragging in desktop browsers
	//$('img').bind('dragstart', function(event) { event.preventDefault(); });

	// disable drag scrolling in mobile browsers
	document.body.addEventListener('touchmove', function(event) {
		event.preventDefault();
	}, false);

	/*****  background changer  *****/
	backgroundChanger.imagepicker();
	backgroundChanger.change(function(){
		var bg = $(this).val();
		$('body').css('background-image', 'url(img/bg/background-' + bg + '.jpg)');
	}).change();


	/*****  drag & drop file uploader  *****/
	uploadInput.fileupload({
		acceptFileTypes: /(\.|\/)(gif|jpe?g|png|bmp)$/i,
		autoUpload: false,
		dataType: 'json',
		url: 'upload/',

		add: function(e, data) {
			var file = data.files[0];
			var message = notifyContainer.notify({
				message: { html: "<small>Datei wird geladen...</small><div class=\"progress progress-striped active\"><div class=\"bar\"></div></div>" },
				fadeOut: { enabled: false },
				closable: false,
				type: 'bangTidy'
			});
			message.show();
			data.context = message;
			data.submit();
		},

		progress: function(e, data) {
			var progress = parseInt(data.loaded / data.total * 100, 10);
			data.context.$element.find('.bar').css(
				'width',
				progress + '%'
			);
		},

		done: function(e, data) {
			$.each(data.result.files, function (index, file) {
				// add element to file list
				var el = $('<dd data-id="' + imageCounter + '" class="clearfix"><i class="icon-ok icon-white"></i><span class="title">' + file.name + '</span><i class="icon-remove icon-white"></i></dd>');
				el.appendTo(fileContainer);
				// remove message
				data.context.hide();
				// add element to surface
				$('<div class="image" title="' + file.name + '" id="image-' + imageCounter + '"><img src="upload/files/' + file.name + '" width="300" /></div>')
					.appendTo(imageContainer)
					.draggable({
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
						containment: "parent",
						stack: "#image-container .image"
					});
					// publish new element
					if (sess) {
						sess.publish("add", data.context, true);
					}

				imageCounter++;
			});
		}

	});

	/*****  file chooser  *****/

	fileContainer
	.on('mouseenter', 'dd', function(event) {
		$('#image-' + $(this).data('id')).addClass('hover');
	})
	.on('mouseleave', 'dd', function(event) {
		$('#image-' + $(this).data('id')).removeClass('hover');
	})
	.on('click', 'dd', function(event) {
		var el = $(this);
		if (el.hasClass('checked')) {
			el.removeClass('checked');
			$('#image-' + el.data('id')).removeClass('active').addClass('hover');
		} else {
			el.addClass('checked');
			$('#image-' + el.data('id')).removeClass('hover').addClass('active');
		}
	})
	.on('click', '.icon-remove', function(event) {
		var el = $(this).parent();
		el.fadeOut();
		$('#image-' + el.data('id')).fadeOut();
	});
});