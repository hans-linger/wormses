var sRootPath = '/';
var sNamePostfix = '.json';
var oData = {};
var oLinks = {};

_.mixin({ dive : function ( obj, props ) {
	if ( typeof props == 'string' ) {
		props = props.split('.');
	}
	if ( props && props.length && typeof obj == 'object' && obj.hasOwnProperty(props[0]) ) {
		return props.length > 1 ? _.dive( obj[props[0]], props.slice(1) ) : obj[props[0]];
	}
	return undefined;
},
put : function ( oObj, aPath, oVal ){
	if ( typeof aPath == 'string' ) {
		aPath = aPath.split(/[,./]/);
	}
	if ( _.isArray( aPath ) ) {
		if ( aPath.length > 1 ) {
			if ( !oObj[aPath[0]] || !_.isObject( oObj[aPath[0]] ) ) {
				oObj[aPath[0]] = {};
			}
			return _.put( oObj[aPath[0]], aPath.slice(1), oVal );
		} else {
			return oObj[aPath[0]] = oVal;
		}
	}
}});

var DataManagerPrivate  = {
	makeLoadRequest : function ( name, callback ) {
		var that = DataManagerPrivate, args = Array.prototype.slice.call( arguments, 2 );
		if ( _.isArray(name) ) {
			name = name.join('/');
		}
//			console.log('Load ' + name);
		return $.ajax({
			url : sRootPath + name + sNamePostfix,
			type : 'get',
			dataType : 'json',
			success : function (d) {
					//console.log('Loaded ' + name);
				if ( d.hasOwnProperty('status') && d.hasOwnProperty('data') ) {
					if ( d.status == 'success' ) {
						that.set( name, d.data );
					}
				} else {
					that.set( name, d );
				}

				window.App.triggerEvent( 'data:loaded', name );
				oLinks[ name.split(/[/.,]/).join('/') ] = d;
				if ( callback && typeof callback == 'function' ) {
					callback.apply( that, args );
				}
			},
			error : function () {
				console.log('error while getting data', arguments);
			}
		});
	},
	set : function ( sName, d ) {
		_.put( oData, sName, d );
	}
};
var DataManagerPublic = function () {
	this.load = function ( name, callback ) {
		// check presence
		if ( _.isArray( name ) && name.length > 1 ) {
			var that = this;
			var oChain = $.Deferred(), oCChain = oChain.promise();
			$.each( name, function ( i, cName ) {
				oCChain = oCChain.then( function () {
//						console.log('Call Load ' + cName);
					return that.loadSingle( cName );
				} );
				//this.loadSingle.apply( this, [cName, Array.prototype.slice.call(arguments, 1)] );
			} );
			if ( oCChain && callback ) {
				var aArgs = Array.prototype.slice.call( arguments, 2 );
				oCChain.done( function () {
//						console.log('callback!');
					callback.apply( that, aArgs );
				});
			}
//				console.log('oc', oCChain);
			oChain.resolve();

		} else {
			if ( _.isArray(name) && name.length == 1 ) {
				name = name[0];
			}
			this.loadSingle.apply( this, arguments );
		}
	};

	this.loadSingle = function ( name, callback ) {
		return DataManagerPrivate.makeLoadRequest.apply( this, arguments );
	};

	this.get = function ( cPath ) {
		if ( cPath ) {
			return _.dive( oData, cPath );
		}
		return '';
	};
	this.has = function ( name ) {
		return oLinks.hasOwnProperty( name.split(/[./,]/).join('/') );
	};

	this.set = function ( sName, oData ) {
		return DataManagerPrivate.set( sName, oData );
	};

	this.dump = function () {
		console.log('DataManager dump:', oData);
	}
};
window.DataManager = new DataManagerPublic;