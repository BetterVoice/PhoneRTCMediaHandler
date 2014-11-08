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
  			'host': 'turn:54.191.155.251',
        'username': 'bettervoice',
        'password': 'B3tt3rV01c3'
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

  	getDescription: {writable: true, value: function getDescription(onSuccess, onFailure, mediaHint) {
  		var role = this.phonertc.role;
      var isInitiator = true;
  		if(!role) { this.startSession(isInitiator, onSuccess, onFailure); }
  	}},

  	setDescription: {writable: true, value: function setDescription(sdp, onSuccess, onFailure) {
  		var role = this.phonertc.role;
      var isInitiator = false;
  		if(!role) { this.startSession(isInitiator, onSuccess, onFailure); }
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
  	startSession: {writable: true, value: function startSession(isInitiator, onSuccess, onFailure) {
      var phonertc = this.phonertc;
  		phonertc.role = isInitiator ? 'caller' : 'callee';
  		var config = {
  			isInitiator: isInitiator,
    		turn: this.turnServer,
    		streams: {
    			audio: true,
    			video: false
    		}
  		};
      var allocating = false;
      var watchdog = null;
      phonertc.session = new cordova.plugins.phonertc.Session(config);
      phonertc.session.on('sendMessage', function (data) {
        if(data.type === 'offer' || data.type === 'answer') {
          phonertc.sdp = data.sdp;
        } else if(data.type === 'candidate') {
          // If we receive another candidate we stop
          // the watchdog and restart it again later.
          if(watchdog) {
            clearTimeout(watchdog);
          } else {
            allocating = true;
          }
          var candidate = "a=" + data.candidate + "\r\n";
          // Video comes before audio
          if(data.id === 'audio') {
            phonertc.sdp = phonertc.sdp.replace(/m=audio.*/, candidate + "$&");
          } else {
            phonertc.sdp += candidate;
          }
          // Check if we have received more candidates
          // or if we can resolve the sdp.
          watchdog = setTimeout(function() {
            if(!allocating) {
              window.console.log(phonertc.sdp);
              onSuccess(phonertc.sdp);
            } else {
              allocating = false;
            }
          }, 100);
        }
        window.console.log('\n\n\n');
        window.console.log(data);
        window.console.log('\n\n\n');
      });

      phonertc.session.on('answer', function () {
        console.log('Answered!');
      });

      phonertc.session.call();
  	}}
	});

	// Return the PhoneRTC media handler implementation.
	return PhoneRTCMediaHandler;
};
