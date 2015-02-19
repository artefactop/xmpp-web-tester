var BOSH_SERVICE = null;
var XMPP_DOMAIN = null;
var connection = null;
var ice_config = {iceServers: [{url: 'stun:stun.l.google.com:19302'}]},
    RTC = null,
    RTCPeerConnection = null,
    AUTOACCEPT = false,
    PRANSWER = true, // use either pranswer or autoaccept
    RAWLOGGING = true,
    MULTIPARTY = false,
    localStream = null,
    list_members = [];


function formatXml(xml) {
    var formatted = '';
    var reg = /(>)(<)(\/*)/g;
    xml = xml.replace(reg, '$1\r\n$2$3');
    var pad = 0;
    jQuery.each(xml.split('\r\n'), function(index, node) {
        var indent = 0;
        if (node.match( /.+<\/\w[^>]*>$/ )) {
            indent = 0;
        } else if (node.match( /^<\/\w/ )) {
            if (pad != 0) {
                pad -= 1;
            }
        } else if (node.match( /^<\w[^>]*[^\/]>.*$/ )) {
            indent = 1;
        } else {
            indent = 0;
        }
 
        var padding = '';
        for (var i = 0; i < pad; i++) {
            padding += '  ';
        }
 
        formatted += padding + node + '\r\n';
        pad += indent;
    });
 
    return formatted;
}

function log(msg) 
{
	$('#log').append('<div></div>').append(document.createTextNode(msg));
	$('#log').append('<br>');
	var elem = document.getElementById('log');
  	elem.scrollTop = elem.scrollHeight;
}

function onConnect(status)
{
	if (status == Strophe.Status.CONNECTING) {
		log('Strophe is connecting.');
	} else if (status == Strophe.Status.CONNFAIL) {
		lengthog('Strophe failed to connect.');
		$('#connect').get(0).value = 'Connect';
	} else if (status == Strophe.Status.DISCONNECTING) {
		log('Strophe is disconnecting.');
	} else if (status == Strophe.Status.DISCONNECTED) {
		log('Strophe is disconnected.');
	$('#connect').get(0).value = 'Connect';
	} else if (status == Strophe.Status.CONNECTED) {
		log('Strophe is connected.');
		log('ECHOBOT: Send a message to ' + connection.jid + 
			' to talk to me.');

		connection.addHandler(onMessage, null, 'message', null, null,  null); 
		connection.send($pres().tree());

		connection.jingle.getStunAndTurnCredentials();
	}
}

function onMessage(msg) {
	var to = msg.getAttribute('to');
	var from = msg.getAttribute('from');
	var type = msg.getAttribute('type');
	var elems = msg.getElementsByTagName('body');

	if (type == "chat" && elems.length > 0) {
	var body = elems[0];

	log('ECHOBOT: I got a message from ' + from + ': ' + 
		Strophe.getText(body));
	
	var reply = $msg({to: from, from: to, type: 'chat', 
		id: connection.getUniqueId('tester')})
			.cnode(Strophe.copyElement(body));
	connection.send(reply.tree());

	log('ECHOBOT: I sent ' + from + ': ' + Strophe.getText(body));
	}

	// we must return true to keep the handler alive.  
	// returning false would remove it after it finishes.
	return true;
}

function onMessageReceipts(msg){
	console.log("onMessageReceipts");
	console.log(msg);
	return true;
}

function send_ping(to) {
	var success = function(stanza){
		console.log(stanza);
		log('PING SUCSESS:'+stanza.from);
	};
	var error= function(stanza){
		log('PING ERROR');
	};;
	var timeout= function(stanza){ //????????
		log('PING TIMEOUT');
	};;
	connection.ping.ping( to, success, error, timeout );
    return true;
}

function onPing( ping ){
  connection.ping.pong( ping );
  return true;
}

function send_raw(raw){
	var parsed = $.parseXML(raw);
	console.log(parsed);
	console.log(parsed.documentElement);
	connection.send(parsed.documentElement);
	return true;
}

function send_message(username, body){
	var reply = $msg({to: username+'@'+XMPP_DOMAIN, type: 'chat'}).c("body").t(body);;
	connection.receipts.sendMessage(reply);
	connection.receipts.sendMessage(reply.tree());
	return true;
}

function makeCall(username){
	console.log("Calling to: "+username);
	var sess = connection.jingle.initiate(username+'@'+XMPP_DOMAIN);
	console.log("New session created");
	console.log(sess);
	sess.sendRinging();
	return true;
}

function onCallIncoming(event, sid) {
	console.log("onCallIncoming: " + event);
	console.log("sid: " + sid);
    alert("Acho! que te estan llamando: "+ sid);
    console.log("Acho! que te estan llamando: "+ sid);
    var sess = connection.jingle.sessions[sid];

	console.log(sess);

    // alternatively...
    sess.terminate("busy");
    connection.jingle.terminate(sid);
    console.log("Llamada colgada "+ sid);
    sess.sendTerminate("busy","web app doesn't support calls");
    return true;
}


$(document).ready(function () {
    RTC = setupRTC();
	connection = new Strophe.Connection(BOSH_SERVICE);

	// Uncomment the following lines to spy on the wire traffic.
	connection.rawInput = function (data) { 
		console.log(data);
		$('#log').append('<span class="stanzaIn">RECV: '+Date()+'</span><br><pre class="prettyprint linenums"><code>' + 
			prettyPrintOne(Strophe.xmlescape(formatXml(data)))+'</code></pre><br>'); 
		var elem = document.getElementById('log');
  		elem.scrollTop = elem.scrollHeight;
	};
	connection.rawOutput = function (data) { 
		$('#log').append('<span class="stanzaOut">SEND: '+Date()+'</span><br><pre class="prettyprint linenums"><code>'  +
		 prettyPrintOne(Strophe.xmlescape(formatXml(data)))+'</code></pre><br>'); 
		var elem = document.getElementById('log');
  		elem.scrollTop = elem.scrollHeight;
	};

	// Uncomment the following line to see all the debug output.
	//Strophe.log = function (level, msg) { log('LOG: ' + msg); };

	$(document).bind('callincoming.jingle', onCallIncoming);
	connection.ping.addPingHandler( onPing );
	connection.receipts.addReceiptHandler(onMessageReceipts,'chat',null,null);

	connection.jingle.ice_config = ice_config;
    if (RTC) {
        connection.jingle.pc_constraints = RTC.pc_constraints;
    }
        if (RTC !== null) {
        RTCPeerconnection = RTC.peerconnection;
        if (RTC.browser == 'firefox') {
            connection.jingle.media_constraints.mandatory.MozDontOfferDataChannel = true;
        }
        //setStatus('please allow access to microphone and camera');
        //getUserMediaWithConstraints();
    } else {
        setStatus('webrtc capable browser required');
    }

    $('.domain').text(XMPP_DOMAIN);

	$('#connect').bind('click', function () {
	var button = $('#connect').get(0);
	if (button.value == 'Connect') {
		button.value = 'Disconnect';

		connection.connect($('#jid').get(0).value +'@'+ XMPP_DOMAIN,
				   $('#pass').get(0).value,
				   onConnect);
		$('#log').html("");
	} else {
		button.value = 'Connect';
		connection.disconnect();
	}
	});

    $('#ping').bind('click', function () {
		var pingJid = $('#pingjid').get(0).value;
		send_ping(pingJid);
    });

    $('#sendRaw').bind('click', function () {
		var raw = $('#raw').get(0).value;
		send_raw(raw);
    });

    $('#sendMessage').bind('click', function () {
		var user = $('#messageUser').get(0).value;
		var message = $('#message').get(0).value;
		send_message(user,message);
    });

    $('#makeCall').bind('click', function () {
		var user = $('#callingUser').get(0).value;
		makeCall(user);
    });

});
