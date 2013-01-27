var conn = new WebSocket('ws://192.168.2.142:8080');
var msg;
var sidebar = $('#sidebar-left');
var ip;
function getip(json){
	ip = json;
};

// connection start
conn.onopen = function(e) {
	$.meow({message: "Verbindung hergestellt!"});
	conn.send("Neuer Client verbunden!");
	sidebar.find('.connected').show();
	sidebar.find('.clients').append('<p><i class="icon-chevron-right icon-white"></i>' + ip + '</p>');
};

// message received
conn.onmessage = function(e) {
	$.meow({message: e.data});
};

// test message sending
$('#btn').click(function(){
	msg = "Hello World!";
	$.meow({message: msg});
	conn.send(msg);
});
