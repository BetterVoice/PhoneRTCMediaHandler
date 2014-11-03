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
		var events = [ ];
  	options = options || {};

  	this.logger = session.ua.getLogger('sip.invitecontext.mediahandler', session.id);
  	this.session = session;
  	this.ready = true;
  	this.audioMuted = false;
  	this.videoMuted = false;

  	// old init() from here on
  	var idx, length, server,
  	  	servers = [],
  	  	stunServers = options.stunServers || null,
  	  	turnServers = options.turnServers || null,
  	  	config = this.session.ua.configuration;
  	this.RTCConstraints = options.RTCConstraints || {};
  	if(!stunServers) { stunServers = config.stunServers; }
  	if(!turnServers) { turnServers = config.turnServers; }

  	/* 
  	 * Change 'url' to 'urls' whenever this issue is solved:
  	 * https://code.google.com/p/webrtc/issues/detail?id=2096
  	 */
  	servers.push({ 'url': stunServers });

  	length = turnServers.length;
  	for(idx = 0; idx < length; idx++) {
  	  server = turnServers[idx];
  	  servers.push({
  	    'url': server.urls,
  	    'username': server.username,
  	    'credential': server.password
  	  });
  	}

  	this.initEvents(events);
  	this.phonertc = {};
	}

	PhoneRTCMediaHandler.prototype = Object.create(SIP.MediaHandler.prototype, {

	});

	// Return the PhoneRTC media handler implementation.
	return PhoneRTCMediaHandler;
};
