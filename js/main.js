var sess, msg, ip;

// publish drag event
function publishDrag(element, left, top) {
	var data = {
		el: element,
		x: left,
		y: top,
		publisher: sess._session_id
	};
	sess.publish("drag", data, true);
}

// publish drag start event
function publishDragStart(element) {
	var data = { el: element };
	sess.publish("drag-start", data, true);
}


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
	var notifyContainer = $('.top-right');

	var sidebar = $('#sidebar-left');
	var clientContainer = $('#client-container');

	var fileContainer = $('#file-container');
	var uploadInput = $('#upload-input');

	var notifyContainer = $('.top-right');

	var imageContainer = $('#image-container');
	var images = imageContainer.find('.image');
	var videos = imageContainer.find('.video');
	var other = imageContainer.find('.other');

	var idCounter = images.length;

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
				var el = $('<dd data-id="' + idCounter + '" class="clearfix"><i class="icon-ok"></i><span class="title">' + file.name + '</span><i class="icon-trash"></i></dd>');
				el.appendTo(fileContainer);
				// remove message
				data.context.hide();

				// publish new element
				if (sess && sess._websocket_connected) {
					sess.publish("add", {
						id: idCounter,
						session: sess.sessionid(),
						name: file.name,
						path: uploadDir + 'files/'
					}, true);
				}

				// add element to surface
				$('<div class="image" title="' + file.name + '" id="image-' + idCounter + '"><img src="' + uploadDir + 'files/' + file.name + '" width="300" /></div>')
					.appendTo(imageContainer)
					.draggable({
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
				idCounter++;
			});
		}
	});


	/*****  FILE LIST  *****/
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

			// publish session id & current elements on connect
			sess.publish("connect", {
				session: sess.sessionid(),
				elements: getIDs(collectElements())
			});

			//console.log('client: ' + sess._session_id);
			//console.log('send elements to server: ' + collectElements());

			notifyContainer.notify({
				message: { text: 'Verbindung hergestellt!' },
				type: 'bangTidy'
			}).show();

			// modify layout
			connectForm.hide();
			disconnectForm.show();
			disconnectForm.find('.server-ip').text(server);
			disconnectForm.find('.client-name').val(sess.sessionid());
			sidebar.slideDown('slow');

		},

		/*****  WAMP connection lost or could not establish  *****/
		function (code, reason) {
			// disconnect from server
			disconnect(reason);
		});
	};

	function disconnect(message) {
		// disconnect from server
		sess.close();

		// show message
		notifyContainer.notify({
			message: { text: message },
			type: 'bangTidy'
		}).show();

		// reset layout
		connectForm.show().find('button').button('reset');
		disconnectForm.hide().find('.server-ip').html('');
		sidebar.slideUp('slow');
		clientContainer.html('');
	}




/*****  EVENTS FROM SERVER  *****/

	function onConnect(topic, event) {
		if (event[1] != undefined) {
			$.each(event[1], function() {
				$.each(this, function(client, session) {
					// add connected client to list
					if (!$('#client-' + client).length) {
						if (session == sess.sessionid()) {
							// this client
							var entry = $('<dd id="client-' + client + '" data-session="' + session + '" class="current"><i class="icon-user"></i> <span>' + session + '</span></dd>');
						} else {
							var entry = $('<dd id="client-' + client + '" data-session="' + session + '"><i class="icon-user"></i> <span>' + session + '</span></dd>');
						}
						entry.hide().appendTo(clientContainer).fadeIn();
					}
				});
			});
		}
		// TODO: synchronize positions
		//console.log('got elements from other client: ' + event.elements);
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
			var element = event.el;
			notifyContainer.notify({
				message: { text: 'Bewege ' + element },
				type: 'bangTidy'
			}).show();
		}
	}

	// added new media element to present
	function onAdd(topic, element) {
		//console.log(element);
		if (element.session != sess.sessionid()) {

			// add element to file list
			fileContainer.append($('<dd data-id="' + idCounter + '" class="clearfix"><i class="icon-ok"></i><span class="title">' + element.name + '</span><i class="icon-trash"></i></dd>'));

			// add element to surface
			$('<div class="image" title="' + element.name + '" id="image-' + idCounter + '"><img src="' + element.path + element.name + '" width="300" /></div>')
				.appendTo(imageContainer)
				.draggable({
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
			idCounter++;
		}
	}

	function onSynchronize(topic, event) {
		console.log(event);
	}

	function onRemove(topic, event) {
		console.log(event);
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
	}

	function collectElements() {
		return $('#image-container').find('.image');
	}

	function getIDs(array) {
		return $.map(array, function(n, i){
			return n.id;
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
