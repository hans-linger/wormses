/**
 * detect if event containst a "special" characters
 * @param sEventName string
 */
var isSpecialEvent = function ( sEventName ) {
	return sEventName.match(/:\*/);
};
/**
 * find callbacks that matches current events
 * @param sEventName
 */
var findSpecialCallbacks = function ( sEventName ) {
	var aResult = [];
	if ( sEventName.match(/:/) ) {
		sEventName = sEventName.split(':');
		var cReg = new RegExp( sEventName[0] + ':' );
		for ( var i in this.aSpecialEvents ) if ( this.aSpecialEvents.hasOwnProperty(i) ) {
			if ( this.aSpecialEvents[i].match( cReg ) ) {
				aResult.push(this._callbacks[ this.aSpecialEvents[i] ]);
			}
		}
	}
	return aResult;
};
/**
 * "all" watcher
 * beware! bwahaha
 * @param sEvents
 * @param fCallback
 * @param oContext
 */
var totalControl = function ( sEvents, fCallback, oContext ) {
	sEvents = sEvents.split(/\s+/);
	for ( var i = 0, cEvent; i < sEvents.length; i++ ) {
		if (  !sEvents[i].match(/:/) ) {
			continue;
		}
		cEvent = sEvents[i].split( ':' );
		cEvent = cEvent[0] + ':*';
		if ( _.indexOf( this.aSpecialEvents, cEvent ) != -1 ) {
			var cCallback = this._callbacks[ cEvent ];
			while ( cCallback.hasOwnProperty('next') && cCallback.next.hasOwnProperty('callback') ) {
				cCallback.next.callback.apply( cCallback.next.context || this, [ sEvents[i] ] );
				cCallback = cCallback.next;
			}
		}
	}
};
/**
 * Extend Backbone events for good
 */
_.extend(Backbone.Events, {
// "all" watcher placeholder
	totalControl : null,
// special events cache container
	aSpecialEvents : [],
// bind
	bind : function () {
		var bSpecial = isSpecialEvent( arguments[0] );
		if ( bSpecial ) {
		// has "special" events - splitting and handling them separately from ordinary events
			var sEvents = arguments[0].split(/\s+/), aSpecial = [], cEvent;
			sEvents.push(null);
		// split ordinary/special events
			while ( cEvent = sEvents.shift() ) {
				if ( isSpecialEvent(cEvent) ) {
					aSpecial.push( cEvent );
				}
			}
		// merge special events to existent
			this.aSpecialEvents = _.union( this.aSpecialEvents, aSpecial );
		// binding vissarionovitch function
			if ( !this.totalControl ) {
				this.totalControl = totalControl;
				this.on('all', this.totalControl, this);
			}
		}
	// do ordinary binding
		this.on.apply( this, _.toArray(arguments) );
	},
	one : function ( sEventName, fCallback, oContext) {
		var that = this;
		var oldFunc = fCallback;
		fCallback = function() {
			that.off.apply( that, [ sEventName, fCallback ] );
			return oldFunc.apply( oContext || that, _.toArray( arguments ) );
		};
		this.bind.apply( this, _.toArray( arguments ) );
	},
// unbind
	unbind : function ( ) {
		this.off.apply( this, _.toArray( arguments ) );
		if ( isSpecialEvent( arguments[0] ) ) {
			var aEvents = arguments[0].split(/\s+/);
			for ( var i = 0; i < aEvents.length; i++ ) {
				if ( aEvents[i].match(/\*/) && _.indexOf(this.aSpecialEvents, aEvents[i]) != -1 && ( this._callbacks[aEvents[i]].next.next.callback || arguments.length == 1 )) {
					this.aSpecialEvents = _.without( this.aSpecialEvents, aEvents[i] );
				}
			}
		}

	}
});
Backbone.Model.prototype = _.extend(Backbone.Model.prototype, Backbone.Events);