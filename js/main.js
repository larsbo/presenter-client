var sess, msg, ip, uploadDir;
var elements = {};		// object to store information about every element
var local = 'localhost';
var uploadPath = '/PresenterServer/upload/';
var minimalScale = 0.5;

function round(x) {
	var k = (Math.round(x * 100) / 100).toString();
	k += (k.indexOf('.') == -1)? '.00' : '00';
	return k.substring(0, k.indexOf('.') + 3);
}


if(!Hammer.HAS_TOUCHEVENTS && !Hammer.HAS_POINTEREVENTS) {
	Hammer.plugins.showTouches();
}

if(!Hammer.HAS_TOUCHEVENTS && !Hammer.HAS_POINTEREVENTS) {
	Hammer.plugins.fakeMultitouch();
}

Hammer.plugins.showTouches();
Hammer.plugins.fakeMultitouch();

$(document).ready(function(){

	// disable drag scrolling in mobile browsers
	document.body.addEventListener('touchmove', function(event) {
		event.preventDefault();
	}, false);

	// disable default firefox image dragging to open it
	document.body.addEventListener('dragstart', function(event) {
		event.preventDefault();
	}, false);


	// initialize some jquery variables
	var bar = $('#bar');
	var connectForm = $('#connect-form');
	var disconnectForm = $('#disconnect-form');
	var clientName = $('#client-name');

	var toggleBar = $('#toggle-bar');
	var toggleAbout = $('#toggle-about');

	var notifyContainer = $('#notifications');
	var clientContainer = $('#client-container');
	var elementContainer = $('#element-container');

	var sidebarRight = $('#sidebar-right');
	var fileContainer = $('#file-container');
	var uploadInput = $('#upload-input');
	var youtubeAddButton = $('#youtube-add-button');
	var youtubeLoadButton = $('#youtube-load-button');
	var youtubeInput = $('#youtube-input');
	var removeFilesButton = $('#remove-files');

	var backgroundChanger = $('#background-changer');
	var colorPicker = $('#colorpicker');
	var trash = $('#trash');


	// set element container's height = window height - topbar height
	$(window).resize(function() {
		elementContainer.css('height', $(document.body).height() - bar.outerHeight() - 20);
	}).resize();


	// initialize upload script
	initializeFileUpload(local, uploadPath);


/*****  TOUCH GESTURES  *****/
	elementContainer.hammer({

		// dragging options:
		drag_block_horizontal: true,
		drag_block_vertical: true,
		drag_max_touches: 0,				// number of allowed parallel touch events (0 = unlimited)

		// transformation (scale & rotation) options:
		transform_always_block: true,
		transform_min_scale: 1,
		transform_min_rotation: 1
	})


	/***  START DRAGGING  ***/
	.on('touch dragstart drag dragend transform', '.element', function(ev) {
		ev.stopPropagation();

		// catch not well defined gestures
		if (ev.gesture === undefined) {
			ev.preventDefault();
			return false;
		}

		// stop default click/touch behaviour
		ev.gesture.preventDefault();

		// get touches
		var touches = ev.gesture.touches;
		var touchLength = touches.length;

		// get target
		var currentTarget = $(ev.currentTarget);
		var currentID = currentTarget.prop('id');

		// iterate over all touches
		for (var t=0; t<touchLength; t++) {
			var touch = touches[t];
			var target = (touch.target.nodeName === 'DIV') ? $(touch.target) : $(touch.target).parents('.element');
			var el = target.prop('id');

			// only use touch events related to current target
			if (el === currentID) {

				switch(ev.type) {

				case 'touch':
					elements[el].lastScale = elements[el].scale;
					elements[el].lastRotation = elements[el].rotation;
					break;

				case 'drag-start':
					currentTarget.css({
						'z-index': getMaxZIndex() + 1
					});
					break;

				case 'drag':
					elements[el].position.x = ev.gesture.deltaX + elements[el].lastPosition.x;
					elements[el].position.y = ev.gesture.deltaY + elements[el].lastPosition.y;
					break;

				case 'transform':

					// check for another touch event on this element
					for (var i=0; i<touchLength; i++) {
						if (i != t) {
							var secondTarget = (touches[i].target.nodeName === 'DIV') ? $(touches[i].target) : $(touches[i].target).parents('.element');
							if (secondTarget.prop('id') === el) {
								elements[el].rotation = ev.gesture.rotation + elements[el].lastRotation;
								elements[el].scale = Math.max(minimalScale, Math.min(elements[el].lastScale * ev.gesture.scale, 10));
							}
						}
					}
					break;

				case 'dragend':
					elements[el].lastPosition.x = elements[el].position.x;
					elements[el].lastPosition.y = elements[el].position.y;
					break;

				}

				// set element properties
				target.css({
					rotate: elements[el].rotation,
					scale: elements[el].scale,
					x: elements[el].position.x,
					y: elements[el].position.y
				});
			}
		}
	})

	.on('hold', '.element', function(ev) {
		var el = $(ev.currentTarget);
		fileContainer.find('dd').each(function(i, element){
			if ($(this).data('id') === el.prop('id')) {
				toggleElement($(this));
				return;
			}
		});
	});



/*****  WEB SOCKET SERVER COMMUNICATION  *****/

	// connect to WAMP server
	function connect(server){
		var url = "ws://" + server + ":8080";
		ab.connect(url, function(session){

			// create session
			sess = session;

			// subscribe to topic & providing an event handler
			sess.subscribe("clients", onClients);
			sess.subscribe("elements", onElements);
			sess.subscribe("add", onAdd);
			sess.subscribe("remove", onRemove);
			sess.subscribe("drag-start", onDragStart);
			sess.subscribe("drag", onDrag);
			sess.subscribe("rotate-scale", onRotateScale);
			sess.subscribe("change-name", onChangeName);
			sess.subscribe("change-color", onChangeColor);
			sess.subscribe("disconnect", onDisconnect);

			// publish session id
			sess.publish("connect", {
				session: sess.sessionid()
			});

			// re-initialize upload script with connected server
			//uploadInput.fileupload('destroy');
			if (server == 'localhost') {
				initializeFileUpload(server, '/PresenterServer/upload/');
			} else {
				initializeFileUpload(server, '/upload/');
			}

			// publish current elements
			var elements = getElements();
			$.each(elements, function() {
				sess.publish("add", {
					session: sess.sessionid(),
					id: this.id,
					name: this.name,
					type: this.type,
					left: this.left,
					top: this.top,
					index: this.index,
					rotation: this.rotation,
					scale: this.scale
				});
			});

			// show message
			notifyContainer.notify({ message: { text: 'Verbindung hergestellt!' } }).show();

			// modify layout
			connectForm.hide();
			disconnectForm.show();
			disconnectForm.find('.server-ip').text(server);
			disconnectForm.find('.client-name').val(sess.sessionid());
			clientContainer.fadeIn('slow');
			colorPicker.trigger('change');
			$('body').removeClass('wait');
		},

		/*****  server connection lost or could not establish  *****/
		function (code, reason) {
			disconnect(reason);
		});
	};

	// disconnect from server
	function disconnect(message) {
		if (sess) {
			sess.close();
		}

		// show message
		notifyContainer.notify({ message: { text: message } }).show();

		// reset layout
		connectForm.show().find('button').button('reset');
		disconnectForm.hide().find('.server-ip').html('');
		clientContainer.fadeOut('slow');
		clientContainer.html('');
		$('body').removeClass('wait');
	};



/*****  EVENTS FROM SERVER  *****/

	function onClients(topic, clients) {
		if (clients[1] != undefined) {
			$.each(clients[1], function() {
				$.each(this, function(client, data) {
					// if no client name set use the session id
					if (data.name == '') {
						data.name = data.session;
					}
					// add connected client to list
					if (!$('#client-' + client).length) {
						var current = '';
						if (data.session == sess.sessionid()) {
							// this client
							current = ' current';
						}
						var entry = $('<div id="client-' + client + '" class="client' + current + '" data-session="' + data.session + '"><img class="circle" src="http://cl.busb.org/L79J/dj.png" /><div class="name">' + data.name + '</div></div>');
						entry.hide().appendTo(clientContainer).fadeIn();

						// set client color
						updateColor(data.session, data.color);
					}
				});
			});
		}
	}

	function onElements(topic, element) {
		$.each(element[1], function() {
			if (this.session != sess.sessionid()) {
				appendElement(this);
			}
		});
	}

	function onAdd(topic, element) {
		if (element.session != sess.sessionid()) {
			appendElement(element);
		}
	}

	function onRemove(topic, event) {
		if (event.session != sess.sessionid()) {
			var file;
			fileContainer.find('dd').each(function(i, element){
				if ($(this).data('id') == event.id) {
					file = $(this);
				}
			});

			// remove file list entry
			file.fadeOut('slow', '', function(){
				file.remove();
				fileContainer.trigger('updateFileList');
			});

			// remove element from surface
			var element = $('#' + event.id);
			if (element.length) {
				element.fadeOut('slow', '', function(){
					element.remove();
				});
			}
		}
	}

	function onDragStart(topic, event) {
		if (event.session != sess.sessionid()) {
			changeZIndex(event);

			notifyContainer.notify({ message: { text: 'Bewege ' + event.id } }).show();
		}
	}

	function onDrag(topic, event) {
		if (event.session != sess.sessionid()) {
			changePosition(event);
		}
	}

	function onRotateScale(topic, event) {
		if (event.session != sess.sessionid()) {
			changeRotationScale(event);
		}
	}

	function onChangeName(topic, event) {
		if ($.isArray(event)) {
			// broadcast
			$.each(event[1], function(session, name) {
				updateName(session, name);
			});
		} else {
			updateName(event.session, event.name);
		}
	}

	function onChangeColor(topic, event) {
		if ($.isArray(event)) {
			// broadcast
			$.each(event[1], function(session, color) {
				updateColor(session, name);
			});
		} else {
			updateColor(event.session, event.color);
		}
	}

	function onDisconnect(topic, event) {
		$.each(event[1], function(id, session) {
			// remove disconnected client from list
			var client = $('#client-' + id);
			if (client.length) {
				client.fadeOut('slow', '', function(){
					client.remove();
				});
			}
		});
	}



/*****  GENERAL FUNCTIONS  *****/
	function getElements() {
		var files = [];
		elementContainer.find('.element').each(function(i, element) {
			var el = $(element);
			var position = el.position();

			var file = {
				id: el.prop('id'),
				name: el.find('.title').text(),
				type: el.data('type'),
				left: position.left,
				top: position.top,
				index: el.css('z-index'),
				rotation: el.css('rotation'),
				scale: el.css('scale')
			}
			files.push(file);
		});
		return files;
	}

	function appendElement(file) {
		// generate unique id by hash of file name
		file.id = md5(file.name);
		var type, image, content;

		// abort if element already exists
		if ($('#' + file.id).length) {
			return $('#' + file.id).offset();
		}

		// check file type
		switch (file.type) {

		case 'image/jpeg':
		case 'image/png':
		case 'image/gif':
		case 'image/bmp':
		case 'image/tiff':
			type = 'image';
			image = 'icon-picture';
			content = '<img src="' + uploadDir + 'files/' + file.name + '" width="100%" />';
			break;

		case 'video/mp4':
		case 'video/ogv':
		case 'video/webm':
			type = 'video';
			image = 'icon-film';
			content = '<video src="' + uploadDir + 'files/' + file.name + '" width="100%" controls preload></video>';
			break;

		case 'audio/mpeg':
		case 'audio/ogg':
			type = 'audio';
			image = 'icon-volume-up';
			content = '<audio src="' + uploadDir + 'files/' + file.name + '" width="100%" controls preload></audio>';
			break;

		case 'video/youtube':
			type = 'video';
			image = 'icon-film';
			content = '<iframe width="100%" height="95%" src="http://www.youtube.com/embed/' + file.name + '?autoplay=1&rel=0" frameborder="0" allowfullscreen></iframe><div class="clearfix"></div>';
			break;

		case 'application/pdf':
			type = 'pdf';
			image = 'icon-file';
			content = '<object data="' + uploadDir + 'files/' + file.name + '" type="application/pdf" width="400" height="300"><p>Kein PDF-Plugin vorhanden! <a href="' + uploadDir + 'files/' + file.name + '">PDF-Datei speichern</a></p></object>';
			break;

		case 'text/plain':
		case 'text/html':
			type = 'text';
			image = 'icon-file-alt';
			content = '';
			break;

		default:
			type = 'unknown';
			image = 'icon-question-sign';
			content = '<i class="icon-question-sign"></i> Unbekannter Datentyp.<br>';
		}

		// compute z-index if undefined
		if (file.index === undefined) {
			file.index = getMaxZIndex() + 1;
		}

		// set rotation if undefined
		if (file.rotation === undefined) {
			file.rotation = 0;
		}

		// set scale if undefined
		if (file.scale === undefined) {
			file.scale = 1;
		}

		// add element to file list
		$('<dd data-id="' + file.id + '" class="clearfix"><i class="' + image + '"></i><span class="title">' + file.name + '</span><div class="btn-group"><button type="button" class="btn btn-warning" title="reset"><i class="icon-refresh"></i></button><button type="button" class="btn btn-danger" title="entfernen"><i class="icon-remove"></i></button></dd>').appendTo(fileContainer);

		// create element
		var element = $('<div class="element ' + type + '" id="' + file.id + '" data-type="' + file.type + '">' + content + '<div class="title">' + file.name + '</div></div>');

		// add element to surface
		element
		.appendTo(elementContainer)
		.css({
			rotate: file.rotation,
			scale: file.scale,
			x: file.left,
			y: file.top,
			'z-index': file.index
		});

		// insert element to collection for touch events
		elements[file.id] = {
			position: {
				x: file.left,
				y: file.top
			},
			lastPosition: {
				x: 0,
				y: 0
			},
			rotation: file.rotation,
			lastRotation: 0,
			scale: file.scale,
			lastScale: 1
		};


		// add content of text files to element container
		if (type == 'text') {
			$.get(uploadDir + 'files/' + file.name, function(data) {
				if (data.length > 1000) {
					data = data.substring(0, 1000) + '...';
				}
				$('#' + file.id).html(data.replace('\n', '<br>') + '<br><br><b>' + file.name + '</b>');
			});
		}

		// update file list & element counter
		fileContainer.trigger('updateFileList');

		return file;
	};

	function removeFile(file) {
		var id = file.data('id');
		var element = $('#' + id);

		// remove file list entry
		file.fadeOut('slow', '', function(){
			file.remove();
			fileContainer.trigger('updateFileList');
		});

		// remove element from surface
		element.fadeOut('slow', '', function(){
			element.remove();
		});

		// publish 'remove item' if connected
		if (sess && sess._websocket_connected) {
			sess.publish("remove", {
				session: sess.sessionid(),
				id: id
			});
		}
	};

	function changePosition(data) {
		var el = $('#' + data.id);
		if (el.length) {
			el.css({
				x: data.left,
				y: data.top
			});
		}
	};

	function changeZIndex(data) {
		var el = $('#' + data.id);
		if (el.length) {
			el.css('z-index', data.index);
		}
	};

	function changeRotationScale(data) {
		var el = $('#' + data.id);
		if (el.length) {
			el.css({
				rotate: data.rotation,
				scale: data.scale
			});
		}
	};

	function updateName(session, name) {
		clientContainer.find('.client').each(function(i, element) {
			if ($(element).data('session') == session) {
				$(element).find('.name').text(name);
			}
		});
	};

	function updateColor(session, color) {
		clientContainer.find('.client').each(function(i, element) {
			if ($(element).data('session') == session) {
				$(element).find('.circle').css({
					'background-color': color,
					'box-shadow': '0 0 0 5px ' + color
				});
				elementContainer.find('.active').css('border-color', color);
			}
		});
	};

	function toggleElement(el) {
		var color = colorPicker.val();

		if (el.hasClass('checked')) {
			el.removeClass('checked');
			$('#' + el.data('id')).removeClass('active').css('background-color', color);
		} else {
			el.addClass('checked');
			$('#' + el.data('id')).addClass('active').css('border-color', color);
		}
	};

	function getMaxZIndex() {
		var maxIndex = 0;
		elementContainer.find('.element').each(function(){
			var index = parseInt($(this).css('z-index'), 10);
			if (index > maxIndex) {
				maxIndex = index;
			}
		});
		return maxIndex;
	};

/*****  ELEMENT DRAGGING  *****/
/*
	function enableDragging(element) {
		element.draggable({
			start: function() {
				// publish 'drag start' if connected
				if (sess && sess._websocket_connected) {
					sess.publish("drag-start", {
						id: element.prop('id'),
						index: getMaxZIndex() + 1
					});
				}
			},
			drag: function() {
				// publish position if connected
				if (sess && sess._websocket_connected) {
					var position = element.offset();
					sess.publish("drag", {
						session: sess.sessionid(),
						id: element.prop('id'),
						left: position.left,
						top: position.top
					});
				}
			},
			stop: function() {
				// publish position if connected
				if (sess && sess._websocket_connected) {
					var position = element.offset();
					sess.publish("drag-end", {
						session: sess.sessionid(),
						id: element.prop('id'),
						left: position.left,
						top: position.top
					});
				}
			},
			// don't drag elements out of the surface
			containment: "parent",
			// setting for z-index of elements
			stack: "#element-container .element",
			// don't resize the surface
			scroll: false
		});
	};*/



/*****  DRAG & DROP FILE UPLOAD  *****/
	function initializeFileUpload(server, path) {
		uploadDir = 'http://' + server + path;
		return uploadInput.fileupload({
			acceptFileTypes: /(\.|\/)(gif|jpe?g|png|bmp)$/i,
			autoUpload: false,
			dataType: 'json',
			url: uploadDir,
	
			// dropped file
			add: function(e, data) {
				var file = data.files[0];
				var message = notifyContainer.notify({
					message: { html: "<small>Datei wird geladen...</small><div class=\"progress progress-striped active\"><div class=\"bar\"></div></div>" },
					fadeOut: { enabled: false }
				});
				message.show();
				data.context = message;
				data.submit();
			},
	
			// transfering file
			progress: function(e, data) {
				var progress = parseInt(data.loaded / data.total * 100, 10);
				data.context.$element.find('.bar').css('width', progress + '%');
			},
	
			// upload finished
			done: function(e, data) {
				$.each(data.result.files, function (index, file) {
	
					// remove upload message
					data.context.hide();
	
					// append element to surface & file list & return position and element id
					appendElement(file);
	
					// publish 'add element' if connected
					if (sess && sess._websocket_connected) {
						var el = $('#' + file.id);
						sess.publish("add", {
							session: sess.sessionid(),
							id: file.id,
							name: file.name,
							type: file.type,
							left: el.css('x'),
							top: el.css('y'),
							index: file.index,
							rotation: 0,	// default rotation: 0
							scale: 1			// default scale: 1
						});
					}
				});
			}
		});
	};



/*****  DROP ELEMENTS INTO TRASH OR CLIENTS  *****/
	trash.droppable({
		activeClass: "active",
		hoverClass: "hover",
		drop: function(event, ui) {
			console.log(event);
			console.log(this);
		}
	});


/*****  FILE LIST INTERACTION  *****/
	fileContainer
	.on('mouseenter', 'dd', function(event) {
		var color = colorPicker.val();
		$('#' + $(this).data('id')).addClass('hover').css('background-color', color);
	})
	.on('mouseleave', 'dd', function(event) {
		$('#' + $(this).data('id')).removeClass('hover').css('background-color', '')
	})
	.on('click', 'dd', function(event) {
		toggleElement($(this));
	})
	.on('click', 'button', function(event) {
		removeFile($(this).parent());
	})
	.bind('updateFileList', function() {
		if (fileContainer.find('dd').length == 0) {
			removeFilesButton.fadeOut();
		} else {
			removeFilesButton.fadeIn();
		}
	});
	removeFilesButton.click(function() {
		fileContainer.find('dd').each(function(i, element) {
			removeFile($(element));
		});
	});



/*****  LAYOUT INTERACTION  *****/
	connectForm.submit(function(e){
		e.preventDefault();
		server = $('#server').val();
		if (server != '') {
			connectForm.find('button').button('loading');
			$('body').addClass('wait');
			connect(server);
		}
	});

	disconnectForm.submit(function(e){
		e.preventDefault();
		// disconnect from server
		disconnect('Verbindung zum Server wurde getrennt!');
	});

	toggleBar.click(function(){
		bar.slideToggle();
		toggleBar.find('i').toggleClass('icon-chevron-up icon-chevron-down');
	});

	clientName.keyup(function(e){
		var charCode = e.charCode || e.keyCode;
		if (charCode == 13) {
			// disable Enter key
			return false;
		} else {
			// publish new name
			sess.publish("change-name", {
				session: sess.sessionid(),
				name: clientName.val()
			});
		}
	});

	colorPicker
	.on('click', function() {
		colorPicker.simplecolorpicker({picker: true});
	})
	.change(function() {
		sess.publish("change-color", {
			session: sess.sessionid(),
			color: colorPicker.val()
		});
	})
	.trigger('click');




/*****  INSERT YOUTUBE VIDEO  *****/
	youtubeInput.css('right', sidebarRight.outerWidth() - 40);
	youtubeAddButton.click(function(){
		// Animate the input field
		if (youtubeInput.is(':visible')) {
			youtubeInput.animate({
				right: sidebarRight.outerWidth() - 40,
				opacity: '0'
			}, 300, function() {
				youtubeInput.css('display', 'none');
			});
		} else {
			youtubeInput.css('display', 'block').animate({
				right: sidebarRight.outerWidth(),
				opacity: '1'
			}, 300, function() {
				youtubeInput.find('input').focus();
			});
		}
	});
	youtubeLoadButton.click(function(){
		var url = youtubeInput.find('input').val()
		if (url != '') {
			var id = youtube_id(url);
			if (id) {
				// create video element
				var file = {
					name: id,
					type: 'video/youtube'
				}
				appendElement(file);

				// set title
				youtube_title(id);

				youtubeInput.animate({
					right: sidebarRight.outerWidth() - 40,
					opacity: '0'
				}, 300, function() {
					youtubeInput.css('display', 'none');
					youtubeInput.find('input').val('');
				});
			}
		}
	});

	function youtube_id(url) {
		var p = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
		return (url.match(p)) ? RegExp.$1 : false;
	}

	function youtube_title(id) {
		$.ajax({
			url: 'http://gdata.youtube.com/feeds/api/videos/' + id + '?v=2&alt=json',
			dataType: 'jsonp',
			success: function (data) {
				var element = md5(id);
				var title = data.entry.title.$t;
				if ($('#' + element).length) {
					$('#' + element).find('.title').text(title);
				}
			}
		});
	}


	/*****  background changer  *****/
	backgroundChanger.imagepicker();
	backgroundChanger.change(function(){
		var bg = $(this).val();
		$('body').css('background-image', 'url(img/bg/background-' + bg + '.jpg)');
	}).change();


	getServer = function(){
		var server = $('#bar').find('.server-ip');
		if (server.val() != '') {
			return server.val() + '/PresenterServer/upload/';
		} else {
			return 'upload/';
		}
	}

});