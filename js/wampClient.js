// WAMP session object
var sess;
// WAMP URL
var wsuri = "ws://192.168.2.142:8080";
var sidebar = $('#sidebar-left');
var msg, ip;

function getip(json){
	ip = json;
};


window.onload = function() {

	// connect to WAMP server
	ab.connect(wsuri, function (session) {

		// create session
		sess = session;
		$.meow({message: "Verbindung hergestellt!"});

		// subscribe to topic, providing an event handler
		sess.subscribe("http://example.com/simple", onEvent);

		sidebar.find('.connected').show();
		sidebar.find('.clients').append('<p><i class="icon-chevron-right icon-white"></i>' + ip + '</p>');

	}, function (code, reason) {
		// WAMP session is gone
		sess = null;
		$.meow({message: reason});

		sidebar.find('.connected').hide();
	});
};

function onEvent(topic, event) {
	console.log(topic);
	console.log(event);
	$.meow({message: topic});
}

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


function updatePosition(element, left, top) {
	publishEvent({
		el: element,
		x: left,
		y: top
	});
}

// test message sending
/*$('#btn').click(function(){
	msg = "Hello World!";
	$.meow({message: msg});
	conn.send(msg);
});*/
