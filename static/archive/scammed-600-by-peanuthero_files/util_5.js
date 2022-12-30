var Util = {	
	socket: null,
	
	
	init: function() {
		$(document).ready(function() {
			try {
				if(io) {}
				
			} catch(err) {
				// Util.networkStatusDisconnected();
			}

		});		
		
		try {
			// Util.socket = io.connect(socket_url_base + ':2096');
			
			// Util.socket.on('disconnect', Util.socketDisconnected);
			
			// Util.socket.on('authApproved', function(data) {
				// console.log("Authorization Granted. Welcome, " + data);
				
			// });
			
			// Util.socket.on('debug', function(data) {
				// console.log(data);
			// });
			
			// Util.socket.emit('uid_check', [
				// socket_uid,
				// nodeID
			// ]);
		} catch(err) {
			
		}
		
		setTimeout(Util.updateSmartTime, 60000);
		
	},
	
	
	forceInt: function(val) {
		val = parseInt(val, 10);
		
		if(Number.isNaN(val)) {
			val = 0;
		}
		
		return val;
	},
	
	
	sanitizeHTML: function(message) {
		message = message.replace(/</g, '&lt;');
		message = message.replace(/>/g, '&gt;');
		message = message.replace(/"/g, '&quot;');
		
		return message;
	},
	
	
	getTime: function() {
		return Math.floor(Date.now() / 1000);
	},
	
	
	niceTime: function(timestamp=0) {
		timestamp = Notify.forceInt(timestamp);
		
		if(timestamp <= 0) {
			timestamp = Notify.getTime();
		}
		
		timestamp = timestamp - (timestamp % 60);
		timestamp = timestamp * 1000;
		
		let d = new Date(timestamp);
		
		// return d.toLocaleDateString().replace(/\//g, '-') + ", " + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
		return d.toDateString() + ", " + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
	},
	
	
	getRelativeTime: function(timestamp) {
		let msPerMinute = 60;
		let msPerHour = msPerMinute * 60;
		let msPerDay = msPerHour * 24;
		let msPerMonth = msPerDay * 30;
		let msPerYear = msPerDay * 365;

		let elapsed = Util.getTime() - timestamp;

		if(elapsed < msPerMinute) {
			 return 'Less than 1 minute ago';   
			 // return Math.floor(elapsed) + ` second${Math.floor(elapsed) > 1 ? 's' : ''} ago`;   
		} else if(elapsed < msPerHour) {
			 return Math.floor(elapsed/msPerMinute) + ` minute${Math.floor(elapsed/msPerMinute) > 1 ? 's' : ''} ago`;   
		} else if(elapsed < msPerDay ) {
			 return Math.floor(elapsed/msPerHour ) + ` hour${Math.floor(elapsed/msPerHour) > 1 ? 's' : ''} ago`;   
		} else if(elapsed < msPerMonth) {
			return Math.floor(elapsed/msPerDay) + ` day${Math.floor(elapsed/msPerDay) > 1 ? 's' : ''} ago`;   
		} else {
			return Util.niceTime(timestamp);   
		}
	},
	
	
	updateSmartTime: function() {
		$(".smart-time").each(function(i) {
			let timestamp = Util.forceInt($(this).attr('data-timestamp'));
			
			if(timestamp > 0 && timestamp < (Date.now() / 1000) && $(this).text().includes('day') == false) {
				$(this).text(Util.getRelativeTime(timestamp));
			}
		});
		
		setTimeout(Util.updateSmartTime, 60000);
	}
	
	
};

Util.init();