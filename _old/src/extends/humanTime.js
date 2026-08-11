if (!Date.now) { Date.now = function now() { return +(new Date); }; }
var oLocale = null;
var oHelpers = {

};
var HumanTime = function () {
	var oWatchers = {
		second : {},
		minute : {},
		hour : {}
	};
	var iCounter = 0;
	var that = this;

	this.init = function () {
		window.setInterval(that.liveSecond, 5000);
	};

	this.liveSecond = function () {
		_.each( oWatchers.second, function ( cWatcher ) {
			that.updateTime( cWatcher );
		} );
		if ( !(++iCounter % 60 ) ) {
			that.liveMinute();
		}
		if ( !( iCounter % 3600 ) ) {
			that.liveHour();
			iCounter = 0;
		}
	};
	this.liveMinute = function () {
		_.each( oWatchers.minute, function ( cWatcher ) {
			that.updateTime( cWatcher );
		} );
	};
	this.liveHour = function () {
		_.each( oWatchers.hour, function ( cWatcher ) {
			that.updateTime( cWatcher );
		} );
	};

	this.addWatch = function ( $Node ) {
		if ( !$Node.data('humantime-raw') ) {
			return;
		}
		var iCTime = Date.now();
		var iTime = $Node.data('humantime-raw');
		var sRandId = 'ht' + Math.round( Math.random() * 10000000 );
		$Node.data('humantime-id', sRandId);
		var iDelta = Math.max( 1, Math.round( ( iCTime - iTime ) / 1000 ) ), sType;

		if ( iDelta < 60 ) {
			// seconds
			sType = 'second';
		} else if ( iDelta < 3600 ) {
			sType = 'minute';
		} else {
			sType = 'hour';
		}

		var oTimeType = _.humanTimeGetType( iTime );
		if ( oTimeType.sType != 'day' ) {
			// make clickable
			$Node.addClass('changeable');
		}

		oWatchers[sType][ sRandId ] = {
			$Node : $Node,
			$c : $Node.find('.c:first'),
			iTime : iTime,
			sId : sRandId,
			bDayState : false
		};
		this.updateTime( oWatchers[sType][sRandId] );
	};

	this.updateTime = function ( oWatcher ) {
		oWatcher.$c.text( _.humanTime( oWatcher.iTime, oWatcher.bDayState ) );
	};

	this.switchWatcher = function ( sId ) {

		var cWatcher = _.find( oWatchers, function ( oCType ) {
			return _.find( oCType, function ( oCWatcher ) {
				return oCWatcher.sId == sId;
			}, this);
		}, this);

		if ( cWatcher && cWatcher.hasOwnProperty( sId ) ) {
			cWatcher[sId].bDayState = !cWatcher[sId].bDayState;
			this.updateTime( cWatcher[sId] );
		}

	};

	this.init();
};
var HumanTimePublic = function (){
	this.HumanTime = new HumanTime;
	this.switchWatcher = function ( sId ) {
		return this.HumanTime.switchWatcher( sId );
	};
	this.addWatch = function ( $Node, oOptions ) {
		if ( oLocale == null && oOptions ) {
			oLocale = oOptions.locale;
		}
		var that = this;
		return $Node.each(function () {
			return that.HumanTime.addWatch( $(this) );
		});
	};
};
window.HumanTime = new HumanTimePublic;

var TIMETYPE_DIFF = 0, TIMETYPE_TIME = 1, TIMETYPE_DATE = 2;
// TEMP

//	var oLocalMonths = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
var oLocalMonths = ['january','february','march','april','may','june','july','august','september','october','november','december'];
var oToday = new Date();
oToday.setHours(0,0,0,0);

_.mixin({ getLocalMonth : function ( iMonth ) { return oLocalMonths[ iMonth ]; } });

_.mixin( { humanTimeSwitch : function ( $Node ) {
	var oWatcher = window.HumanTime.switchWatcher( $Node.data('humantime-id') );
}});
_.mixin( { humanTimeGetType : function ( ms ) {
	var oToday = new Date(), oNow = new Date();
	var iDiff = Math.max( 1, Math.ceil( oNow.getTime() - ms ) / 1000 ), sType;

	oToday.setHours(0,0,0,0);
	var oYesterday = new Date( oToday - 60*60*24*1000 );
	if ( iDiff < 60 ) {
		sType = 'second';
	} else if ( iDiff < 60*60 ) {
		sType = 'minute';
		iDiff /= 60;
	} else if ( iDiff < Math.round( (oNow - oToday)/1000 ) ) {
		iDiff /= 3600;
		sType = 'hour';
	} else if ( iDiff < Math.round( (oNow - oYesterday)/1000 ) ) {
		sType = 'yesterday';
	} else {
		sType = 'day';
	}
	return { sType : sType, iDiff : iDiff };
}});
_.mixin( { humanTime : function ( ms, oOptions ) {
	if ( !oOptions ) {
		oOptions = {};
	}
	var oNow = new Date();
	if ( !ms ) {
		ms = oNow.getTime() - 1000;
	}
	var oType = _.humanTimeGetType( ms );
	if ( oOptions.bDay ) {
		oType.sType = 'day';
	}
	if ( oLocale == null ) {
		oLocale = oOptions.locale;
	}
	console.log('ol', oLocale);
	var sReturn = '', oDate;
	_.each( oLocale.human[ oType.sType ], function ( cStep ) {

		switch ( typeof cStep ) {
			case 'number':
				switch ( cStep ) {
					//
					case TIMETYPE_DIFF:
						sReturn += Math.round( oType.iDiff ) + ' ';
					break;

					case TIMETYPE_TIME:
						 oDate = new Date( ms );
						 sReturn += ('0' + oDate.getHours()).substr(-2) + ':' + ('0' + oDate.getMinutes()).substr(-2) + ' ';
					break;

					case TIMETYPE_DATE:
						oDate = new Date( ms );
						sReturn += ( typeof oLocale.func == 'function' ? oLocale.func( oDate.getFullYear(), oDate.getMonth(), oDate.getDate() ) : oDate.getDate() + ' ' + oLocale.months[ oLocalMonths[oDate.getMonth()] ] ) + ' ';
					break;
				}
			break;

			case 'string':
				sReturn += cStep;
			break;

			case 'object':
				if ( cStep.hasOwnProperty('length') ) {
					sReturn += _.plural( Math.round( oType.iDiff ), cStep );
				}
			break;
		}
	} );
	return sReturn;
} } );