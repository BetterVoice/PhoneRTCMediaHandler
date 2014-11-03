/**
 * @fileoverview MediaHandler
 */

/**
 * MediaHandler
 * @class PeerConnection helper Class.
 * @param {SIP.Session} session
 * @param {Object} [options]
 */
module.exports = function(SIP) {
	/**
	 * Implements the PhoneRTC media handler constructor.
	 */
	var PhoneRTCMediaHandler = function(session, options) {
		// Create a logger.
  	this.logger = session.ua.getLogger('sip.invitecontext.mediahandler', session.id);

  	// Initialize the media flags.
  	this.audioMuted = false;

  	// Try to use a turn server provided by sip.js.
  	var servers = [];
  	var turnServers = [];
  	if(options) {
  		turnServers = options.turnServers;
  	} else {
  		turnServers = session.ua.configuration.turnServers;
  	}
  	for(var index = 0; index < turnServers.length; index++) {
  		servers.push({
  			'host': turnServers[index].urls,
  	    'username': turnServers[index].username,
  	    'password': turnServers[index].password
  		});
  	}
  	if(servers.length > 0) {
  		this.turnServer = servers[0];
  	} 
  	// In case the turn server is to be hard coded.
  	/* else {
  		this.turnServer = {
  			'host': 'turn:turn.example.com:3478',
        'username': 'user',
        'password': 'pass'
  		};
  	} */

  	// Finish initialization.
  	this.phonertc = {
  		'state': 'disconnected'
  	};
  	this.ready = true;
	}

	PhoneRTCMediaHandler.prototype = Object.create(SIP.MediaHandler.prototype, {
		/**
		 * render() is called by sip.js so it must be defined but 
		 * rendering is handled by the PhoneRTC plugin.
		 */
		render: {writable: true, value: function render () { }},
  	isReady: {writable: true, value: function isReady () {
  	  return this.ready;
  	}},
  	close: {writable: true, value: function close () {
  	  this.logger.log('INFO: Closing the current session.');
  	  this.phonertc.session.close();
  	}}
	});

	// Return the PhoneRTC media handler implementation.
	return PhoneRTCMediaHandler;
};
