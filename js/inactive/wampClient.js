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

	var bar = $('#bar');
	var connectForm = $('#connect-form');
	var disconnectForm = $('#disconnect-form');
	var clientName = $('#client-name');
	var toggleButton = $('#toggle-button');

	var sidebar = $('#sidebar-left');
	var clientContainer = $('#client-container');

	var notifyContainer = $('.top-right');

	var images = $('#image-container').find('.image');


	connectForm.submit(function(e){
		// connect to server
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

	// toggle connect bar
	toggleButton.click(function(){
		bar.slideToggle();
		toggleButton.find('i').toggleClass('icon-chevron-up icon-chevron-down');
	});

	// change client name
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
		console.log(element);

		// add element to file list
		fileContainer.append($('<dd data-id="' + imageCounter + '" class="clearfix"><i class="icon-ok"></i><span class="title">' + element.name + '</span><i class="icon-trash"></i></dd>'));

			// add element to surface
			$('<div class="image" title="' + element.name + '" id="image-' + imageCounter + '"><img src="' + element.path + element.name + '" width="300" /></div>')
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

			imageCounter++;
	}

	function onRemove(topic, event) {
		console.log(event);
	}
});

function getip(json){
	ip = json;
};



/*
function publishEvent(data) {
	sess.publish("http://example.com/simple", data);
}

function callProcedure() {
	// issue an RPC, returns promise object
	sess.call("http://example.com/simple/calc#add", 23, 7).then(

		// RPC success callback
		function (res) {
			console.log("got result: " + res);
		},

		// RPC error callback
		function (error, desc) {
			console.log("error: " + desc);
		}
	);
}
*/
