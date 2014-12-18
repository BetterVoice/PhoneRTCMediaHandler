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
       * - holding
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
  			this.phonertc.session.close();
  			this.phonertc.session = null;
  			// Update our state.
  			this.phonertc.state = 'disconnected';
  		}
  	}},

  	getDescription: {writable: true, value: function getDescription(onSuccess, onFailure, mediaHint) {
      var phonertc = this.phonertc;
      var isInitiator = !phonertc.role || phonertc.role === 'caller';
  		if(isInitiator && phonertc.state === 'disconnected') {
        this.startSession(null, onSuccess, onFailure);
      } else {
        if(phonertc.state === 'connected' ||
           phonertc.state === 'holding' ||
           phonertc.state === 'muted') {
          this.updateSession(onSuccess, onFailure);
        } else if(phonertc.state === 'disconnected') {
          onSuccess(phonertc.sdp);
          phonertc.state = 'connected';
        }
      }
  	}},

  	setDescription: {writable: true, value: function setDescription(sdp, onSuccess, onFailure) {
  		var phonertc = this.phonertc;
      var isNewCall = !phonertc.role;
  		if(isNewCall) {
        this.startSession(sdp, onSuccess, onFailure);
      }
  		var session = phonertc.session;
  		if(phonertc.role === 'caller') {
        session.receiveMessage({'type': 'answer', 'sdp': sdp});
        onSuccess();
        if(phonertc.state === 'disconnected') {
          phonertc.state = 'connected';
        }
  		}
  	}},

  	isMuted: {writable: true, value: function isMuted() {
  	  return {
  	    audio: this.phonertc.state === 'muted',
  	    video: true
  	  };
  	}},

  	mute: {writable: true, value: function mute(options) {
      var phonertc = this.phonertc;
  		var state = phonertc.state;
  		if(state === 'connected') {
  			phonertc.session.mute();
  			phonertc.state = 'muted';
  		}
  	}},

  	unmute: {writable: true, value: function unmute(options) {
      var phonertc = this.phonertc;
  		var state = phonertc.state;
  		if(state === 'muted') {
  			phonertc.session.unmute();
  			phonertc.state = 'connected';
  		}
  	}},

    hold: {writable: true, value: function hold () {
      var phonertc = this.phonertc;
      var state = phonertc.state;
      if(state === 'connected') {
        phonertc.session.mute();
        phonertc.state = 'holding';
      }
    }},

    unhold: {writable: true, value: function unhold () {
      var phonertc = this.phonertc;
      var state = phonertc.state;
      if(state === 'holding') {
        phonertc.session.unmute();
        phonertc.state = 'connected';
      }
    }},

  	// Local Methods.
  	startSession: {writable: true, value: function startSession(sdp, onSuccess, onFailure) {
      var phonertc = this.phonertc;
  		phonertc.role = sdp === null ? 'caller' : 'callee';
  		var config = {
  			isInitiator: phonertc.role === 'caller',
    		turn: this.turnServer,
    		streams: {
    			audio: true,
    			video: false
    		}
  		};
      // Unfortunately, there is no message to let us know
      // that PhoneRTC has finished gathering ice candidates.
      // We use a watchdog to make sure all the ICE candidates
      // are allocated before returning the SDP.
      var watchdog = null;
      phonertc.session = new cordova.plugins.phonertc.Session(config);
      phonertc.session.on('sendMessage', function (data) {
        if(data.type === 'offer' || data.type === 'answer') {
          phonertc.sdp = data.sdp;
          if(data.type === 'answer') {
            if(onSuccess) { onSuccess(); }
          }
          var fingerprint = data.sdp.search(/a=fingerprint:.*\r\n/g));
          var ufrag = data.sdp.search(/a=ice-ufrag:.*\r\n/g));
          var pwd = data.sdp.search(/a=ice-pwd:.*\r\n/g));
          window.console.log('************************************************');
          window.console.log(fingerprint + '\n' + ufrag + '\n' + pwd + '\n');
          window.console.log('************************************************');
        } else if(data.type === 'candidate') {
          // If we receive another candidate we stop
          // the watchdog and restart it again later.
          if(watchdog !== null) {
            clearTimeout(watchdog);
          }
          // Append the candidate to the SDP.
          var candidate = "a=" + data.candidate + "\r\n";
          if(data.id === 'audio') {
            phonertc.sdp += candidate;
          }
          // Start the watchdog.
          watchdog = setTimeout(function() {
            // Finish session description before we return it.
            if(phonertc.role !== 'caller') {
              phonertc.sdp = phonertc.sdp.replace('a=setup:actpass', 'a=setup:passive');
            }
            phonertc.sdp = phonertc.sdp.replace(/a=crypto.*\r\n/g, '');
            // If an on success callback has been provided
            // lets go ahead and give it the final sdp.
            if(onSuccess) { onSuccess(phonertc.sdp); }
          }, 500);
        }
      });
      // If we received a session description pass it on to the
      // PhoneRTC plugin.
      if(phonertc.role === 'callee') {
        phonertc.session.receiveMessage({'type': 'offer', 'sdp': sdp});
      }
      // Start the media.
      phonertc.session.call();
  	}},

    updateSession: {writable: true, value: function updateSession(onSuccess, onFailure) {
      var phonertc = this.phonertc;
      var watchdog = null;
      phonertc.session.on('sendMessage', function (data) {
        if(data.type === 'offer') {
          phonertc.sdp = data.sdp;
          if(phonertc.state === 'holding') {
            phonertc.sdp = phonertc.sdp.replace(/a=sendrecv\r\n/g, 'a=inactive\r\n');
          } else if(phonertc.state === 'muted') {
            phonertc.sdp = phonertc.sdp.replace(/a=sendrecv\r\n/g, 'a=recvonly\r\n');
          }
          if(onSuccess) { onSuccess(phonertc.sdp); }
          window.console.log('\n\n' + phonertc.sdp + '\n\n');
        }
      });
      // Start the media.
      phonertc.session.renegotiate();
    }}
	});

	// Return the PhoneRTC media handler implementation.
	return PhoneRTCMediaHandler;
};
