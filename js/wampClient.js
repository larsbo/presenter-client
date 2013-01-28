var sess, msg, ip;

$(document).ready(function(){
	// WAMP URL
	//var wsuri = "ws://192.168.2.142:8080";

	// VARIABLES
	var sidebar = $('#sidebar-left');
	var connectForm = $('#connect-form');
	var disconnectForm = $('#disconnect-form');

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
	});

	// connect to WAMP server
	function connect(server){
		var url = "ws://" + server + ":8080";
		ab.connect(url, function(session){
	
			// create session
			sess = session;
			$.meow({message: "Verbindung hergestellt!"});
	
			// subscribe to topic, providing an event handler
			sess.subscribe("drag", onEvent);
			sess.subscribe("drag-start", onEvent);
			sess.subscribe("drag-end", onEvent);

			connectForm.hide().find('button').button('reset');
			disconnectForm.show();
			disconnectForm.find('.server-ip').html(server);
			sidebar.find('.clients').append('<p><i class="icon-chevron-right icon-white"></i>' + ip + '</p>');
	
		}, function (code, reason) {
			// WAMP session is gone
			sess = null;
			$.meow({message: reason});

			connectForm.show();
			disconnectForm.hide().find('.server-ip').html('');
		});
	};

	function onEvent(topic, event) {
		switch (topic) {
		case 'drag':
			if (event.publisher != sess._session_id) {
				changePosition(event);
			}
			break;
		case 'drag-start':
			if (event.publisher != sess._session_id) {
				var element = event.el;
				$.meow({message: "Bewege " + element + "..."});
			}
			break;
		case 'drag-end':
			//$.meow({message: "Neue Position: " + event.x + ":" + event.y});
			break;
		}
	}

	function changePosition(data) {
		var el = $('#' + data.el);
		if (el.length) {
			el.offset({
				left: data.x,
				top: data.y
			})
		}
	}

});

function getip(json){
	ip = json;
};


/* update position of dragged element */
function publishDrag(element, left, top) {
	var data = {
		el: element,
		x: left,
		y: top,
		publisher: sess._session_id
	};
	sess.publish("drag", data, true);
}

/* update position of dragged element */
function publishDragStart(element) {
	var data = { el: element };
	sess.publish("drag-start", data, true);
}


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
