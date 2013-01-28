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

var getIDs = function(array){
	return $.map(array, function(n, i){
		return n.id;
	});
};

$(document).ready(function(){

	var sidebar = $('#sidebar-left');
	var notifyContainer = $('.top-right');
	var connectForm = $('#connect-form');
	var disconnectForm = $('#disconnect-form');
	var bar = $('#bar');
	var toggleButton = $('#toggle-button');
	var images = $('#image-container').find('.image');

	connectForm.submit(function(e){
		e.preventDefault();
		var server = $('#server').val();
		if (server != '') {
			connectForm.find('button').button('loading');
			connect(server);
		}
	});

	disconnectForm.submit(function(e){
		e.preventDefault();
		connectForm.show();
		disconnectForm.hide().find('.server-ip').html('');
		sidebar.slideUp('fast').find('.clients').html('');

		sess.publish("disconnect", { client: sess._session_id }, true);
		sess = null;
	});

	toggleButton.click(function(){
		bar.slideToggle();
		toggleButton.find('i').toggleClass('icon-chevron-up icon-chevron-down');
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


/*****  WAMP SERVER COMMUNICATION  *****/

	// connect to WAMP server
	function connect(server){
		var url = "ws://" + server + ":8080";
		ab.connect(url, function(session){
	
			// create session
			sess = session;
	
			// subscribe to topic, providing an event handler
			sess.subscribe("drag", onDrag);
			sess.subscribe("drag-start", onDragStart);
			sess.subscribe("connect", onConnect);
			sess.subscribe("disconnect", onDisconnect);
			//sess.subscribe("drag-end", onEvent);

			sess.publish("connect", {
				client: sess._session_id,
				elements: getIDs(images)
			}, true);

			notifyContainer.notify({
				message: { text: 'Verbindung hergestellt!' },
				type: 'bangTidy'
			}).show();

			// modify layout
			connectForm.hide().find('button').button('reset');
			disconnectForm.show();
			disconnectForm.find('.server-ip').html(server);
			sidebar.slideDown('slow');

		}, function (code, reason) {
			// WAMP connection lost or could not establish
			sess = null;
			notifyContainer.notify({
				message: { text: reason },
				type: 'bangTidy'
			}).show();

			connectForm.find('button').button('reset');
			disconnectForm.hide().find('.server-ip').html('');
		});
	};

	// got message from server
	function onDrag(topic, event) {
		if (event.publisher != sess._session_id) {
			changePosition(event);
		}
	}
	function onDragStart(topic, event) {
		if (event.publisher != sess._session_id) {
			var element = event.el;
			notifyContainer.notify({
				message: { text: 'Bewege ' + element },
				type: 'bangTidy'
			}).show();
		}
	}
	function onConnect(topic, event) {
		// add new client to list
		if (!sidebar.find($('#' + event.client))) {
			var client = $('<dd id="' + event.client + '">' + event.client + '</dd>');
			sidebar.find('.clients').append(client);
		}
		// synchronize positions
		console.log(event.elements);
	}
	function onDisconnect(topic, event) {
		sidebar.find($('#' + event.client)).remove();
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
