var ModuleModelPrivate = {
	onLoadSuccess : function () {
		this.bLoaded = true;
		this.onLoadSuccess.apply( this, Array.prototype.slice.call(arguments,1) );
		this.trigger('loaded');
	},
	onLoadError : function () {
		this.onLoadError.apply( this, Array.prototype.slice.call(arguments,1) );
	}
};
Backbone.ModuleModel = Backbone.Model.extend({
	bLoaded : false,
	oParams : {},
	parse : function ( oObj ) {
		if ( oObj.hasOwnProperty('status') && oObj.hasOwnProperty('data') ) {
			if ( oObj.status.toLowerCase() == 'success' ) {
				return Backbone.Model.prototype.parse.apply( this, [ oObj.data ] );
			} else {
				// error. whadda do?
			}
		} else if ( oObj.hasOwnProperty('status') && oObj.status == 'error' ) {
			// handle error
			if ( oObj.code == 'ACCESS_DENIED_ERROR' ) {
//					document.location = '/login';
			}
			return this.onLoadError( oObj );
		} else {
			return Backbone.Model.prototype.parse.apply( this, [ oObj ] );
		}

	},
	load : function ( oParams, oModule ) {
		this.oParams = oParams || {};
		if ( this.onBeforeLoad( oModule ) !== false ) {
			var that = this;
			if ( typeof this.url == 'string' && this.url.length ) {
				this.fetch(_.extend({}, {
					success : function () {
						ModuleModelPrivate.onLoadSuccess.apply(that, _.toArray( arguments ))
					},
					error : function () {
						ModuleModelPrivate.onLoadError.apply(that, _.toArray( arguments ) );
					}
				}, oParams ));
			} else {
				// fake load
				ModuleModelPrivate.onLoadSuccess.call( that );
			}
		}
	},
	onBeforeLoad : function () {},
	onLoadSuccess : function () {},
	onLoadError : function () {},
	getParam : function ( sParamName ) {
		return this.oParams.hasOwnProperty( sParamName ) ? this.oParams[ sParamName ] : '';
	}
});