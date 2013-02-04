var sess, msg, ip;

$(document).ready(function(){

	// disable drag scrolling in mobile browsers
	document.body.addEventListener('touchmove', function(event) {
		event.preventDefault();
	}, false);


	var uploadDir = 'http://localhost/PresenterServer/upload/';

	var bar = $('#bar');
	var connectForm = $('#connect-form');
	var disconnectForm = $('#disconnect-form');
	var clientName = $('#client-name');
	var toggleButton = $('#toggle-button');

	var notifyContainer = $('#notifications');

	var sidebarLeft = $('#sidebar-left');
	var clientContainer = $('#client-container');

	var fileContainer = $('#file-container');
	var uploadInput = $('#upload-input');
	var removeFilesButton = $('#remove-files');

	var elementContainer = $('#element-container');

	var backgroundChanger = $('#background-changer');


	/*****  DRAG & DROP FILE UPLOAD  *****/
	uploadInput.fileupload({
		acceptFileTypes: /(\.|\/)(gif|jpe?g|png|bmp)$/i,
		autoUpload: false,
		dataType: 'json',
		url: uploadDir,

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

		progress: function(e, data) {
			var progress = parseInt(data.loaded / data.total * 100, 10);
			data.context.$element.find('.bar').css(
				'width',
				progress + '%'
			);
		},

		done: function(e, data) {
			$.each(data.result.files, function (index, file) {

				// append element to surface & file list
				var position = appendElement(file);
				console.log(position);

				// remove upload message
				data.context.hide();

				// publish new element
				if (sess && sess._websocket_connected) {
					sess.publish("add", {
						session: sess.sessionid(),
						name: file.name,
						type: file.type,
						left: position.left,
						top: position.top
					}, true);
				}
			});
		}
	});


	/*****  FILE LIST  *****/
	fileContainer
	.on('mouseenter', 'dd', function(event) {
		$('#element-' + $(this).data('id')).addClass('hover');
	})
	.on('mouseleave', 'dd', function(event) {
		$('#element-' + $(this).data('id')).removeClass('hover');
	})
	.on('click', 'dd', function(event) {
		var el = $(this);
		if (el.hasClass('checked')) {
			el.removeClass('checked');
			$('#element-' + el.data('id')).removeClass('active').addClass('hover');
		} else {
			el.addClass('checked');
			$('#element-' + el.data('id')).addClass('active');
		}
	})
	.on('click', '.icon-trash', function(event) {
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



/*****  WAMP SERVER COMMUNICATION  *****/

	// connect to WAMP server
	function connect(server){
		var url = "ws://" + server + ":8080";
		ab.connect(url, function(session){
	
			// create session
			sess = session;
	
			// subscribe to topic, providing an event handler
			sess.subscribe("connect", onConnect);
			sess.subscribe("disconnect", onDisconnect);
			sess.subscribe("changeName", onChangeName);
			sess.subscribe("drag", onDrag);
			sess.subscribe("drag-start", onDragStart);
			sess.subscribe("add", onAdd);
			sess.subscribe("remove", onRemove);
			sess.subscribe("synchronize", onSynchronize);

			// publish session id
			sess.publish("connect", {
				session: sess.sessionid()
			});

			// publish current elements
			var elements = getElements();
			$.each(elements, function() {
				var position = $(this).position();
				sess.publish("add", {
					session: sess.sessionid(),
					name: this.name,
					type: this.type,
					left: position.left,
					top: position.top
				}, true);
			});

			notifyContainer.notify({ message: { text: 'Verbindung hergestellt!' } }).show();

			// modify layout
			connectForm.hide();
			disconnectForm.show();
			disconnectForm.find('.server-ip').text(server);
			disconnectForm.find('.client-name').val(sess.sessionid());
			sidebarLeft.slideDown('slow');

		},

		/*****  WAMP connection lost or could not establish  *****/
		function (code, reason) {
			disconnect(reason);
		});
	};

	function disconnect(message) {
		// disconnect from server
		sess.close();

		// show message
		notifyContainer.notify({ message: { text: message } }).show();

		// reset layout
		connectForm.show().find('button').button('reset');
		disconnectForm.hide().find('.server-ip').html('');
		sidebarLeft.slideUp('slow');
		clientContainer.html('');
	};




/*****  EVENTS FROM SERVER  *****/

	function onConnect(topic, event) {
		if (event[1] != undefined) {
			$.each(event[1], function() {
				$.each(this, function(client, session) {
					// add connected client to list
					if (!$('#client-' + client).length) {
						if (session == sess.sessionid()) {
							// this client
							var entry = $('<dd id="client-' + client + '" data-session="' + session + '" class="text-info"><i class="icon-user"></i> <span>' + session + '</span></dd>');
						} else {
							var entry = $('<dd id="client-' + client + '" data-session="' + session + '"><i class="icon-user"></i> <span>' + session + '</span></dd>');
						}
						entry.hide().appendTo(clientContainer).fadeIn();
					}
				});
			});
		}
	}

	function onDisconnect(topic, event) {
		$.each(event[1], function(id, session) {
			// remove disconnected client
			var client = $('#client-' + id);
			if (client.length) {
				client.fadeOut('slow', '', function(){
					client.remove();
				});
			}
		});
	}

	function onChangeName(topic, event) {
		clientContainer.find('dd').each(function(i, el){
			if ($(el).data('session') == event.session) {
				$(el).find('span').text(event.name);
			}
		});
	}

	function onDrag(topic, event) {
		if (event.publisher != sess.sessionid()) {
			changePosition(event);
		}
	}

	function onDragStart(topic, event) {
		if (event.publisher != sess.sessionid()) {
			notifyContainer.notify({ message: { text: 'Bewege ' + event.el } }).show();
		}
	}

	// added new media element
	function onAdd(topic, element) {

		// only add elements from other clients
		if (element.session != sess.sessionid()) {
			appendElement(element);
		}
	}

	function onSynchronize(topic, event) {
		// iterate over all elements got from server
		$.each(event[1], function() {

			if (this.session != sess.sessionid()) {
				appendElement(this);
			}
		});
	}

	function onRemove(topic, event) {
		// only remove elements on other clients
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
			var element = $('#element-' + event.id);
			if (element.length) {
				element.fadeOut('slow', '', function(){
					element.remove();
				});
			}
		}
	}



	/*****  FORM SUBMIT  *****/
	connectForm.submit(function(e){
		e.preventDefault();
		server = $('#server').val();
		if (server != '') {
			connectForm.find('button').button('loading');
			connect(server);
		}
	});
	disconnectForm.submit(function(e){
		e.preventDefault();
		// disconnect from server
		disconnect('Verbindung zum Server wurde getrennt!');
	});


	/*****  TOGGLE CONNECT-DISCONNECT BAR  *****/
	toggleButton.click(function(){
		bar.slideToggle();
		toggleButton.find('i').toggleClass('icon-chevron-up icon-chevron-down');
	});


	/*****  CHANGE CLIENT NAME  *****/
	clientName.keyup(function(e){
		var charCode = e.charCode || e.keyCode;
		if (charCode == 13) {
			// disable Enter key
			return false;
		} else {
			sess.publish("changeName", {
				session: sess.sessionid(),
				name: clientName.val()
			});
		}
	});


	/*****  CHANGE ELEMENT POSITION  *****/
	function changePosition(data) {
		var el = $('#' + data.el);
		if (el.length) {
			el.offset({
				left: data.x,
				top: data.y
			})
		}
	};


	function getElements() {
		var files = [];
		elementContainer.find('.element').each(function(i, element) {
			var file = {
				name: $(element).prop('title'),
				type: $(element).data('type')
			}
			files.push(file);
		});
		return files;
	}


	function appendElement(file) {
		// generate unique id by hash of file name
		var id = md5(file.name);

		// abort if element already exists
		if ($('#element-' + id).length) {
			return $('#element-' + id).position();
		}

		var type, image, content;

		switch (file.type) {

		case 'image/jpeg':
		case 'image/png':
		case 'image/gif':
		case 'image/bmp':
		case 'image/tiff':
			type = 'image';
			image = 'icon-picture';
			content = '<img src="' + uploadDir + 'files/' + file.name + '" width="300" />';
			break;

		case 'video/mp4':
		case 'video/ogv':
		case 'video/webm':
			type = 'video';
			image = 'icon-film';
			content = '<video src="' + uploadDir + 'files/' + file.name + '" width="320" height="200" controls preload></video>';
			break;

		case 'audio/mpeg':
		case 'audio/ogg':
			type = 'audio';
			image = 'icon-volume-up';
			content = '<audio src="' + uploadDir + 'files/' + file.name + '" controls preload></audio>';
			break;

		case 'application/pdf':
			type = 'image';
			image = 'icon-file';
			content = file.name;
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

		// add element to file list
		$('<dd data-id="' + id + '" class="clearfix"><i class="' + image + '"></i><span class="title">' + file.name + '</span><i class="icon-trash"></i></dd>').appendTo(fileContainer);

		// add element to surface
		var element = $('<div class="element ' + type + '" title="' + file.name + '" id="element-' + id + '" data-type="' + file.type + '">' + content + '</div>');
		var target = element.appendTo(elementContainer);

		if (type == 'text') {
			$.get(uploadDir + 'files/' + file.name, function(data) {
				if (data.length > 1000) {
					data = data.substring(0, 1000) + '...';
				}
				target.html(data.replace('\n', '<br>') + '<br><br><b>' + file.name + '</b>');
			});
		}

		// make element draggable & resizeable
		addGestures(element);

		// update file list & element counter
		fileContainer.trigger('updateFileList');

		return element.position();
	};


	function removeFile(file) {
		var id = file.data('id');
		var name = file.find('.title').text();
		var element = $('#element-' + id);

		// remove file list entry
		file.fadeOut('slow', '', function(){
			file.remove();
			fileContainer.trigger('updateFileList');
		});

		// remove element from surface
		element.fadeOut('slow', '', function(){
			element.remove();
		});

		/* publish 'remove item' if connected */
		if (sess && sess._websocket_connected) {
			sess.publish("remove", {
				session: sess.sessionid(),
				id: id,
				name: name
			}, true);
		}
	};


	function addGestures(element) {
		// make element dragable
		element.draggable({
			start: function() {
				/* publish 'drag start' if connected */
				if (sess && sess._websocket_connected) {
					sess.publish("drag-start", { el: element.attr('id') }, true);
				}
			},
			drag: function() {
				/* publish current position if connected */
				if (sess && sess._websocket_connected) {
					var pos = element.position();
					sess.publish("drag", {
						el: element.attr('id'),
						x: pos.left,
						y: pos.top,
						publisher: sess.sessionid()
					}, true);
				}
			},
			stop: function() {
				/* publish current position if connected */
				if (sess && sess._websocket_connected) {
					var pos = element.position();
					sess.publish("drag-end", {
						el: element.attr('id'),
						x: pos.left,
						y: pos.top,
						publisher: sess.sessionid()
					}, true);
				}
			},
			containment: "parent",
			stack: "#element-container .image"
		});
	};


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