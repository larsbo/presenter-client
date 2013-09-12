// CONFIGURATION
var sess, msg, ip, uploadDir;
var uploadPath = '/PresenterServer/upload/';	// path to local storage script (php required)

var SCALE_MIN = 0.5;
var SCALE_MAX = 3.0;
var SCALE_SMOOOTHNESS = 0.9;
var ROTATION_SMOOOTHNESS = 0.5;


/*if(!Hammer.HAS_TOUCHEVENTS && !Hammer.HAS_POINTEREVENTS) {
	Hammer.plugins.showTouches();
}
if(!Hammer.HAS_TOUCHEVENTS && !Hammer.HAS_POINTEREVENTS) {
	Hammer.plugins.fakeMultitouch();
}*/

// ALWAYS LOAD PLUGINS FOR DEBUGGING
Hammer.plugins.showTouches();
Hammer.plugins.fakeMultitouch();



// disable drag scrolling in mobile browsers
document.body.addEventListener('touchmove', function(event) {
	event.preventDefault();
}, false);

// disable default firefox image dragging to open it
document.body.addEventListener('dragstart', function(event) {
	event.preventDefault();
}, false);

function round(x) {
	var k = (Math.round(x * 100) / 100).toString();
	k += (k.indexOf('.') == -1)? '.00' : '00';
	return k.substring(0, k.indexOf('.') + 3);
}



$(document).ready(function(){

	// initialize required variables
	var topBar = $('#top-bar');
	var connectForm = $('#connect-form');
	var disconnectForm = $('#disconnect-form');
	var clientName = $('#client-name');

	var toggleBar = $('#toggle-bar');
	var toggleAbout = $('#toggle-about');
	var toggleLog = $('#toggle-log');
	var toggleTitle = $('#toggle-title');
	var toggleSidebarRight = $('#toggle-sidebar-right');
	var toggleGestures = $('#toggle-gestures');

	var notifyContainer = $('#notifications');
	var sidebarLeft = $('#sidebar-left');
	var sidebarRight = $('#sidebar-right');
	var elementContainer = $('#element-container');

	var clientContainer = $('#client-container');
	var fileContainer = $('#file-container');
	var uploadInput = $('#upload-input');
	var youtubeAddButton = $('#youtube-add-button');
	var youtubeLoadButton = $('#youtube-load-button');
	var youtubeInput = $('#youtube-input');
	var removeFilesButton = $('#remove-files');

	var backgroundChanger = $('#background-changer');
	var colorPicker = $('#colorpicker');
	var showLog = toggleLog.is(':checked');
	var gesturesEnabled = toggleGestures.is(':checked');


	// update element container's height on screen resize
	$(window).resize(function() {
		adjustElementContainer();
	}).resize();


	// initialize upload script
	initializeFileUpload('localhost', uploadPath);


	// initialize touch gestures
	elementContainer.find('.element').each(function(i, element) {
		Touch(element);
	});




/*****  TOUCH GESTURES  *****/

	function Touch(element){
		var el = $(element);
		var id = element.prop('id');
		var box = el.parent();

		var Hammer = box.hammer({
			prevent_default: true,				// stop default touch behaviour

			// dragging options:
			drag_block_horizontal: true,
			drag_block_vertical: true,
			drag_max_touches: 0,					// number of allowed parallel touch events (0 = unlimited)
			drag_min_distance: 0,

			// transformation options:
			transform_always_block: true,
			transform_min_rotation: 0,
			transform_min_scale: 0
		});

		// storage object for element data
		var o = {
			initialX: 0,	// initial element position
			initialY: 0,
			positionX: 0,	// current element position
			positionY: 0,
			offsetX: 0,		// element borders touch offset
			offsetY: 0,
			scale: 1,
			lastScale: 1,
			rotate: 0,
			lastRotate: 0,
			touch1X: 0,
			touch1Y: 0,
			touch2X: 0,
			touch2Y: 0,
			touchCenterX: 0,
			touchCenterY: 0,
			touchDistance: 0,
			transform: true		// flag if transformation is allowed
		};

		Hammer
		.on("transformstart", function(event){
			if (gesturesEnabled) {
				// get the original positions of the 2 touches
				var touches = event.gesture.touches;
				o.touch1X = touches[0].pageX;
				o.touch1Y = touches[0].pageY;
				o.touch2X = touches[1].pageX;
				o.touch2Y = touches[1].pageY;

				// compute center of touches
				o.touchCenterX = (o.touch1X + o.touch2X) / 2;
				o.touchCenterY = (o.touch1Y + o.touch2Y) / 2;

				// compute euclidean distance of touches
				o.touchDistance = Math.sqrt(Math.pow(o.touch1X - o.touch2X, 2) + Math.pow(o.touch1Y - o.touch2Y, 2));
				if (o.touchDistance > 200) {
					o.transform = false;
				}
			}
		})

		.on("transform", function(event) {
			if (gesturesEnabled) {
				if (o.transform) {
					// compute transformation
					o.rotate = o.lastRotate + event.gesture.rotation * ROTATION_SMOOOTHNESS;
					o.scale = Math.max(SCALE_MIN, Math.min(o.lastScale * event.gesture.scale * SCALE_SMOOOTHNESS, SCALE_MAX));

					// transform element
					el.css({
						rotate: o.rotate,
						scale: o.scale
					});

					// publish rotation & scale if connected
					if (connected()) {
						sess.publish("rotate-scale", {
							session: sess.sessionid(),
							id: id,
							rotation: o.rotate,
							scale: o.scale
						});
					}
				}
			}
		})

		.on("transformend", function() {
			if (gesturesEnabled) {
				// store transformation
				o.lastScale = o.scale;
				o.lastRotate = o.rotate % 360;
				o.transform = true;

				// show logging message
				if (showLog) {
					notifyContainer.notify({
						message: {text: 'Element ' + id + ' rotiert/skaliert'}
					}).show();
				}
			}
		})

		.on("dragstart", function(event) {
			// update z-index of element to be on top
			var zIndex = getMaxZIndex() + 1;
			el.parent().css({
				zIndex: zIndex
			});

			// get element position
			o.initialX = box.position().left;
			o.initialY = box.position().top;

			if (event.gesture !== undefined) {
				// compute touch offset from the object borders
				o.offsetX = event.gesture.center.pageX - o.initialX;
				o.offsetY = event.gesture.center.pageY - o.initialY;
			}

			// publish drag start if connected
			if (connected()) {
				sess.publish("drag-start", {
					session: sess.sessionid(),
					id: id,
					zIndex: zIndex
				});
			}
		})

		.on("drag", function(event) {
			//new coordinates
			o.positionX = event.gesture.center.pageX - o.offsetX;
			o.positionY = event.gesture.center.pageY - o.offsetY;

			// move element container
			box.css({
				left: o.positionX,
				top: o.positionY
			});

			// publish position if connected
			if (connected()) {
				sess.publish("drag", {
					session: sess.sessionid(),
					id: id,
					left: o.positionX,
					top: o.positionY
				});
			}
		})


		.on("dragend", function(event) {
			// show logging message
			if (showLog) {
				notifyContainer.notify({
					message: {text: 'Element ' + id + ' verschoben'}
				}).show();
			}

			// publish position if connected
			if (connected()) {
				sess.publish("drag-end", {
					session: sess.sessionid(),
					id: id,
					left: o.positionX,
					top: o.positionY
				});
			}
		});
	};



/*****  WEB SOCKET SERVER COMMUNICATION  *****/

	// connect to WAMP server
	function connect(server) {
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
			if (server === 'localhost') {
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

			// show connection message
			notifyContainer.notify({
				message: {
					text: 'Verbindung zum Server wurde hergestellt!'
				}
			}).show();

			// update layout
			connectForm.hide();
			disconnectForm.show();
			disconnectForm.find('.server-ip').text(server);
			disconnectForm.find('.client-name').val(sess.sessionid());
			sidebarLeft.fadeIn('slow');
			colorPicker.trigger('change');
			$('body').removeClass('wait');
		},

		/*****  server connection lost or could not establish  *****/
		function (code, reason) {
			disconnect(reason);
		});
	};

	// disconnect from server
	function disconnect(result) {
		var message;
		if (sess) {
			sess.close();
		}

		// show message
		if (result === 'Connection could not be established.') {
			message = 'Es konnte keine Verbindung hergestellt werden.';
		} else {
			message = 'Die Verbindung zum Server wurde getrennt.';
		}
		notifyContainer.notify({
			message: {
				text: message
			}
		}).show();

		// reset layout
		connectForm.show().find('button').button('reset');
		disconnectForm.hide().find('.server-ip').html('');
		sidebarLeft.fadeOut('slow');
		clientContainer.html('');
		$('body').removeClass('wait');
	};

	// check if client is connected to a server
	function connected() {
		if (sess && sess._websocket_connected) {
			return true;
		} else {
			return false;
		}
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
						var entry = $('<div id="client-' + client + '" class="client' + current + '" data-session="' + data.session + '"><img class="circle" src="' + getGravatar(data.name) + '" /><div class="name">' + data.name + '</div></div>');
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
		}

		console.log('drag start');
		// highlight active client
		highlightActiveClient(event.session);
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
			// use position of outer box 'element-box',
			// but transformation of inner box 'element'
			// to achieve consistence between different clients
			var position = el.parent().position();

			var file = {
				id: el.prop('id'),
				name: el.find('.title').text(),
				type: el.data('type'),
				left: position.left,
				top: position.top,
				index: el.css('z-index'),
				rotation: el.css('rotate'),
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

		// - image
		case 'image/jpeg':
		case 'image/png':
		case 'image/gif':
		case 'image/bmp':
		case 'image/tiff':
			type = 'image';
			image = 'icon-picture';
			content = '<img src="' + uploadDir + 'files/' + file.name + '" />';
			break;

		// - video
		case 'video/mp4':
		case 'video/ogv':
		case 'video/webm':
			type = 'video';
			image = 'icon-film';
			content = '<video src="' + uploadDir + 'files/' + file.name + '" width="100%" controls preload></video>';
			break;

		// - audio
		case 'audio/mpeg':
		case 'audio/ogg':
			type = 'audio';
			image = 'icon-volume-up';
			content = '<audio src="' + uploadDir + 'files/' + file.name + '" width="100%" controls preload></audio>';
			break;

		// youtube video
		case 'video/youtube':
			type = 'video';
			image = 'icon-film';
			content = '<iframe width="100%" height="95%" src="http://www.youtube.com/embed/' + file.name + '?autoplay=1&rel=0" frameborder="0" allowfullscreen></iframe><div class="overlay"></div><div class="clearfix"></div>';
			break;

		// - pdf
		case 'application/pdf':
			type = 'pdf';
			image = 'icon-file';
			content = '<object data="' + uploadDir + 'files/' + file.name + '" type="application/pdf" width="400" height="300"><p>Kein PDF-Plugin vorhanden! <a href="' + uploadDir + 'files/' + file.name + '">PDF-Datei speichern</a></p></object>';
			break;

		// - text file
		case 'text/plain':
		case 'text/html':
			type = 'text';
			image = 'icon-file-alt';
			content = '';
			break;

		// - unknown file type
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
		$('<dd data-id="' + file.id + '" class="clearfix"><i class="' + image + '"></i><span class="title">' + file.name + '</span><div class="btn-group"><button type="button" class="reset btn btn-warning" title="zur&#252cksetzen"><i class="icon-refresh"></i></button><button type="button" class="delete btn btn-danger" title="entfernen"><i class="icon-remove"></i></button></dd>').appendTo(fileContainer);

		// create element
		var box = $('<div class="element-box">'
								+ '<div class="element ' + type + '" id="' + file.id + '" data-type="' + file.type + '">'
									+ content 
									+ '<div class="title alert-default"' + (showTitle() ? '' : ' style="display:none;"') + '>' + file.name + '</div>'
								+ '</div>'
							+ '</div>');

		// add outer box 'element-box' to surface at the specific position
		box.appendTo(elementContainer).css({
			left: file.left,
			top: file.top,
			zIndex: file.index
		});
		console.log(file);

		// get inner box 'element'
		var element = box.find('.element');

		// rotate/scale inner box
		element.css({
			rotate: file.rotation,
			scale: file.scale,
		});

		// enable touch gestures
		Touch(element);

		// add content of text files to element container
		if (type === 'text') {
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

	function resetFile(file) {
		var el;
		var id = file.data('id');
		var elements = getElements();

		$.each(elements, function() {
			if (this.id === id) {
				el = this;
			}
		});

		var data = {
			id: file.data('id'),
			left: 10,
			top: 10,
			rotation: 0,
			scale: 1
		};

		changePosition(data);
		changeRotationScale(data);

		// publish position, rotation & scale if connected
		if (connected()) {
			sess.publish("rotate-scale", {
				session: sess.sessionid(),
				id: id,
				rotation: 0,
				scale: 1
			});
			sess.publish("drag", {
				session: sess.sessionid(),
				id: id,
				left: 0,
				top: 0
			});
		}
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

		// publish 'remove' if connected
		if (connected()) {
			sess.publish("remove", {
				session: sess.sessionid(),
				id: id
			});
		}
	};

	function changePosition(data) {
		var el = $('#' + data.id).parent();
		if (el.length) {
			el.css({
				left: data.left,
				top: data.top
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
				$(element).find('img').prop('src', getGravatar(name));
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
			$('#' + el.data('id')).removeClass('active').css('background-color', '');
		} else {
			el.addClass('checked');
			$('#' + el.data('id')).addClass('active').css('border-color', color);
		}
	};

	function getMaxZIndex() {
		var maxIndex = 0;
		elementContainer.find('.element-box').each(function(){
			var index = parseInt($(this).css('z-index'), 10);
			if (index > maxIndex) {
				maxIndex = index;
			}
		});
		return maxIndex;
	};

	function highlightActiveClient(session) {
		clientContainer.find('.client').each(function(i, element) {
			if ($(element).data('session') == session) {
				console.log(element);
			}
		});
	};


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

			if (showLog) {
				message.show();
			}
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
					if (connected()) {
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


/*****  TOP BAR INTERACTION  *****/
	toggleBar.click(function(){
		topBar.toggle('fast', '', function(){
			adjustElementContainer();
			if (topBar.is(':visible')) {
				toggleAbout.show();
				$('#toggle-bar-content').show();
			} else {
				toggleAbout.hide();
				$('#toggle-bar-content').hide();
			}
		});
		toggleBar.toggleClass('btn-info').find('i').toggleClass('icon-chevron-up icon-chevron-down');
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
	.on('click', '.delete', function(event) {
		removeFile($(this).parents('dd'));
	})
	.on('click', '.reset', function(event) {
		resetFile($(this).parents('dd'));
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

	// file list options
	toggleSidebarRight.click(function(){
		sidebarRight.find('.sidebar-content').toggle('fast');
		toggleSidebarRight.toggleClass('btn-info').find('i').toggleClass('icon-chevron-right icon-chevron-left');
	});

	sidebarRight.find('input').iCheck({
		checkboxClass: 'icheckbox_square-orange',
		radioClass: 'iradio_square-orange'
	});

	toggleTitle.on('ifChanged', function(event){
		var element = elementContainer.find('.element');
		var title = element.find('.title');
		if ($(event.target).is(':checked')) {
			title.slideDown();
		} else {
			title.slideUp();
		}
	});

	toggleLog.on('ifChanged', function(event){
		showLog = $(event.target).is(':checked');
	});

	toggleGestures.on('ifChanged', function(event){
		gesturesEnabled = $(event.target).is(':checked');
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

	clientName.keyup(function(e){
		// publish new name
		sess.publish("change-name", {
			session: sess.sessionid(),
			name: clientName.val()
		});
	}).keypress(function(e){
		var charCode = e.keyCode || e.which;
		if (charCode === 13) {
			// disable Enter key to prevent disconnect form submit
			return false;
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
	};

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
	};

	function getGravatar(name) {
		return 'http://www.gravatar.com/avatar.php?gravatar_id=' + md5(name) + '&r=PG&s=100&default=identicon';
	};

	function showTitle() {
		return $('#toggleTitle').is(':checked');
	};

	function adjustElementContainer() {
		if (topBar.is(':visible')) {
			elementContainer.css({
				'height': $(document.body).height() - topBar.outerHeight(),
				'margin-top': 70
			});
		} else {
			elementContainer.css({
				'height': $(document.body).height(),
				'margin-top': 0
			});
		}
	};


	/*****  background changer  *****/
	var backgroundChangerOpen = $('#background-changer-open');
	var backgroundChangerClose = $('#background-changer-close');
	var backgroundChangerContainer = $('#background-changer-container');
	backgroundChangerOpen.click(function(){
		backgroundChangerOpen.hide();
		backgroundChangerClose.show();
		backgroundChangerContainer.css('bottom', 5);
	});
	backgroundChangerClose.click(function(){
		backgroundChangerOpen.show();
		backgroundChangerClose.hide();
		backgroundChangerContainer.css('bottom', -100);
	});
	backgroundChanger.imagepicker();
	backgroundChanger.change(function(){
		var bg = $(this).val();
		$('body').css('background-image', 'url(img/bg/background-' + bg + '.jpg)');
	}).change();


	getServer = function(){
		var server = topBar.find('.server-ip');
		if (server.val() != '') {
			return server.val() + '/PresenterServer/upload/';
		} else {
			return 'upload/';
		}
	}

});