var DataManager = require('./DataManager');
var sLocaleRootPath = 'locale/';

var localeManagerPrivate = {
	parseLocaleString : function ( sData, aParams ) {
		if ( _.isString( aParams ) ) {
			aParams = [ aParams ];
		}
		if ( sData == '' ) {
			// simple variable
			return aParams.length ? aParams.shift() : '';
		} else if ( typeof sData == 'string' ) {
			// simple string
			return sData;
		} else if ( _.isArray( sData ) ) {
			return _.reduce( sData, function ( sStr, cVal ) {
				return sStr + localeManagerPrivate.parseLocaleString( cVal, aParams );
			}, '');
		} else if ( _.isObject(sData) && sData.hasOwnProperty('%plural%') ) {
			// plural form
			var iNum = aParams.length ? parseInt( aParams.shift() ) : 0;
			return _.plural( iNum, sData['%plural%'] );
		} else if ( _.isObject(sData) ) {
			// need to dive deeper
			if ( aParams && aParams.length ) {
				// try to get property name from params
				var sProp = aParams.shift();
				if ( sData.hasOwnProperty( sProp ) ) {
					return localeManagerPrivate.parseLocaleString( sData[sProp], aParams );
				}
			} else if ( sData.hasOwnProperty('__title') && typeof sData['__title'] == 'string' ) {
				// try to take "title" (somewhat default)
				return sData['__title'];
			}
		}
		return '';
	}
};
var localeManagerPublic = function () {

	this.localeId = 'ru_RU';

	this.load = function ( name, callback ) {
		if ( _.isArray( name ) ) {
			name = _.map( name, _.bind( function (x) { return sLocaleRootPath + this.localeId + '/' + x; }, this ) );
			name = _.filter( name, function ( x ) { return !window.DataManager.has(x); } );
			if ( !name.length ) {
				callback.apply( window.DataManager, Array.prototype.slice.call(arguments, 2) );
				return;
			}
		} else if ( _.isString( name ) ) {
			name = sLocaleRootPath + this.localeId + '/' + name;
			if ( window.DataManager.has( name ) ) {
				callback.apply( window.DataManager, Array.prototype.slice.call(arguments, 2) );
				return;
			}
		}
		return window.DataManager.load.apply(this, Array.prototype.slice.call(arguments));
	};

	this.loadSingle = function ( name, callback ) {
		if ( _.isArray( name ) ) {
			name = name.join('/');
		}
		var oldCallback = callback;
		callback = function () {
			window.App.triggerEvent( 'locale:loaded', name );
			oldCallback.apply(this, Array.prototype.slice.call(arguments));
		};
		return window.DataManager.loadSingle.apply(DataManager, Array.prototype.slice.call(arguments));
	};

	/**
	 * get locale string
	 */
	this.get = function ( cPath, aArgs) {
		var r = window.DataManager.get('locale.' + this.localeId + '.' + cPath );
		if ( !r && window.App ) {
			r = window.DataManager.get('locale.' + this.localeId + '.' + window.App.getCurrentModuleName() + '.' + cPath);
		}
		return r ? localeManagerPrivate.parseLocaleString( r, aArgs ) : '';
	};

	this.getDateString = function ( iYear, iMonth, iDay, oOptions ) {
		switch ( this.localeId ) {
			case 'en_EN':
			default:
				return this.getProperMonth( iMonth, true ) + ' ' + iDay + ', ' + iYear;
			break;

			case 'ru_RU':
				return iDay + ' ' + this.getProperMonthOf( iMonth ) + ' ' + iYear;
			break;
		}
	};
	this.getProperMonth = function ( iMonth, bCapitalize ) {
		if ( bCapitalize ) {
			var m = window.LocaleManager.get('common.date.months.' + _.getLocalMonth(iMonth));
			return m.substr(0,1).toUpperCase() + m.substr(1);
		} else {
			return window.LocaleManager.get('common.date.months.' + _.getLocalMonth(iMonth));
		}

	};
	this.getProperMonthOf = function ( iMonth, bCapitalize ) {
		if ( bCapitalize ) {
			var m = window.LocaleManager.get('common.date.months_of.' + _.getLocalMonth(iMonth));
			return m.substr(0,1).toUpperCase() + m.substr(1);
		} else {
			return window.LocaleManager.get('common.date.months_of.' + _.getLocalMonth(iMonth));
		}

	};
	this.getHumanDate = function ( iYear, iMonth, iDay ) {
		return window.LocaleManager.getDateString( iYear, iMonth, iDay, { bCapitalize : true } );
	}

};
window.LocaleManager = new localeManagerPublic;