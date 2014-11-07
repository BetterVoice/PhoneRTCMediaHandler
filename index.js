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
  	window.console.log('Loading the PhoneRTC 2.0 Media Handler.');

  	// Try to use a Turn server provided by sip.js.
  	var turnServers = [];
  	if(options) {
  		turnServers = options.turnServers;
  	} else {
  		turnServers = session.ua.configuration.turnServers;
  	}
  	if(turnServers && turnServers.length > 0) {
  		this.turnServer = {
  			'host': turnServers[0].urls,
  	    'username': turnServers[0].username,
  	    'password': turnServers[0].password
  		};
  	} else {
  		this.turnServer = {
  			'host': 'turn:numb.viagenie.ca',
        'username': 'webrtc@live.com',
        'password': 'muazkh'
  		};
  	}

  	// Finish initialization.
  	this.phonertc = {
  		/*
  		 * Possible states are:
  		 * - disconnected
  		 * - connected
  		 * - muted
       */
  		'state': 'disconnected'
  	};
	}

	PhoneRTCMediaHandler.prototype = Object.create(SIP.MediaHandler.prototype, {
		/**
		 * render() is called by sip.js so it must be defined but 
		 * rendering is handled by the PhoneRTC plugin.
		 */
		render: {writable: true, value: function render() { }},

  	isReady: {writable: true, value: function isReady() { return true; }},

  	close: {writable: true, value: function close() {
  		var state = this.phonertc.state;
  		if(state !== 'disconnected') {
  			var session = this.phonertc.session;
  			session.close();
  			session = null;
  			// Update our state.
  			this.phonertc.state = 'disconnected';
  		}
  	}},

  	getDescription: {writable: true, value: function getDescription(mediaHint) {
  		var role = this.phonertc.role;
  		if(!role) { this.startSession(true); }
  	}},

  	setDescription: {writable: true, value: function setDescription(sdp) {
  		var role = this.phonertc.role;
  		if(!role) { this.startSession(false); }
  		var session = this.phonertc.session;
  		if(role === 'caller') {
  			session.receiveMessage({'type': 'answer', 'sdp': sdp});
  		} else if(role === 'callee') {
  			session.receiveMessage({'type': 'offer', 'sdp': sdp});
  		}
  		this.phonertc.state = 'connected';
  	}},

  	isMuted: {writable: true, value: function isMuted() {
  	  return {
  	    audio: this.phonertc.state === 'muted',
  	    video: true
  	  };
  	}},

  	mute: {writable: true, value: function mute(options) {
  		var state = this.phonertc.state;
  		if(state === 'connected') {
  			var session = this.phonertc.session;
  			session.streams.audio = false;
				session.renegotiate();
  			this.phonertc.state = 'muted';
  		}
  	}},

  	unmute: {writable: true, value: function unmute(options) {
  		var state = this.phonertc.state;
  		if(state === 'muted') {
  			var session = this.phonertc.session;
  			session.streams.audio = true;
				session.renegotiate();
  			this.phonertc.state = 'connected';
  		}
  	}},

  	// Local Methods.
  	startSession: {writable: true, value: function startSession(isInitiator) {
  		this.phonertc.role = isInitiator ? 'caller' : 'callee';
  		var config = {
  			isisInitiator: isInitiator,
    		turn: this.turnServer,
    		streams: {
    			audio: true,
    			video: false
    		}
  		};
      window.console.log('cordova: ' + cordova);
      window.console.log('plugins: ' + plugins);
  		this.phonertc.session = new cordova.plugins.phonertc.Session(config);
  	}}
	});

	// Return the PhoneRTC media handler implementation.
	return PhoneRTCMediaHandler;
};
