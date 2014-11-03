/**
 * Creates a new object and then initializes it.
 */
function create(constructor) {
	return function() {
		var instance = Object.create(constructor.prototype);
    var result = constructor.apply(instance);
    return typeof result === 'object' ? result : instance;
	}
}

module.exports = function(SIP) {
	/**
	 * Implements the PhoneRTC media handler constructor.
	 */
	var PhoneRTCMediaHandlerImpl = function(session, options) {
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

  	/* Change 'url' to 'urls' whenever this issue is solved:
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

	// Instantiate a PhoneRTC media handler and return the instance
	// to sip.js.
	var PhoneRTCMediaHandler = create(PhoneRTCMediaHandlerImpl);
	return PhoneRTCMediaHandler;
};
