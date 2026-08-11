
var sDefaultModule = 'index';

var oModuleLoadingBus = new (function () {
	this.oLoadedModules = {};
	this.oMainModule = null;
	this.oQueue = {};
	this.oSubscriptions = {};
	this.oRouter = null;

	this.reset = function ( oRouter, oMainModule ) {
		this.oRouter = oRouter;
		this.oMainModule = oMainModule;
		this.oQueue = {};
		this.oLoadedModules = {};
		this.oSubscriptions = {};
	};

	this.subscribeModule = function ( oModule ) {
		if ( _.isEmpty(oModule.aRequiredModules) && !oModule.sParentModule ) {
			return false;
		}
		if ( oModule.aRequiredModules ) {
			_.each( oModule.aRequiredModules, _.bind( function (x) {
				this.subscribe( oModule, x );
			}, this ) );
		}
		if ( oModule.sParentModule ) {
			this.subscribe( oModule, oModule.sParentModule );
		}
		return true;
	};

	this.subscribe = function ( oModule, sModuleName ) {
		if ( !this.oQueue.hasOwnProperty( oModule.sName ) ) {
			this.oQueue[ oModule.sName ] = [];
		}
		this.oQueue[ oModule.sName ].unshift( sModuleName );
		this.oSubscriptions[ sModuleName ] = oModule.sName;
	};

	this.fire = function ( oRequiredModule ) {
		this.oLoadedModules[ oRequiredModule.sName ] = oRequiredModule;
		if ( !this.subscribeModule( oRequiredModule ) ) {
			this.loaded( oRequiredModule );
		}
	};

	this.loaded = function ( oModule ) {
		if ( oModule.sName == this.oMainModule.sName ) {
			// hooray! all loaded
			this.onFinalLoad();
		} else {
			// check if all dependent modules loaded
			var sDependentModule = this.oSubscriptions[ oModule.sName ];
			if ( sDependentModule && this.oQueue.hasOwnProperty( sDependentModule ) ) {
				// clear dependencies
				delete this.oSubscriptions[ oModule.sName ];
				this.oQueue[ sDependentModule ].splice( this.oQueue[ sDependentModule ].indexOf( oModule.sName ), 1 );
				if ( !this.oQueue[ sDependentModule ].length ) {
					this.loaded( this.oLoadedModules[ sDependentModule ] );
				}
			}
		}
	};

	this.onFinalLoad = function () {
		this.oRouter.startModulesLoad();
	};
});

var AppRouter = Backbone.Router.extend({
	oRoutes : null,
	oSidebarBlocks : null,
	oCurrentModule : null,
// params like /app/@id/etc, named
	oUrlParams : {},
// options like /app/etc|sortOrder, not named
	aUrlOptions : [],
	aModulesToLoad : [],
	oRequiredModules : {},
	oLoadedModules : {},
	aModulesToShow : [],
	sLayout : '',

	routes : {
		'*index' : 'pageHandler'
	},

	pageHandler : function ( url ) {
		if ( !url ) {
			url = 'index';
		}
		this.aUrlOptions = url.match(/\|.+$/) ? _.filter( url.replace(/^[^|]+\|(.+)$/, '$1').split('|'), function (a) { return a.length; } ) : [];
		url = url.replace(/\|.*$/, '').replace(/^!/, '');
		this.sUrl = url;
		var oModule = this.getModuleByUrl( url );
		this.oUrlParams = oModule.params;

		if ( oModule ) {
			if ( oModule.object.hasOwnProperty('__auth') ) {
				var bPermitted = _.indexOf( window.DataManager.get('context.authorities'), oModule.object['__auth'] ) != -1;
				if ( !bPermitted ) {
					document.location = '/login';
				}
			}
			this.requireModule( oModule, this.onModuleRequire );
			window.App.triggerEvent( 'common:url-changed', url );
		}
	},
	requireModule : function ( oModule, fCallback ) {
		var that = this;
		var o = require('./modules/' + oModule['object']['__path'] + '/module');
		o.init();
		if ( o && o.hasOwnProperty('sName') && fCallback && typeof fCallback == 'function' ) {
			fCallback.call(that, o);
		}
	},
	reloadModule : function () {
		if ( this.oRequiredModules ) {
			_.each( this.oRequiredModules, function (x) { x.reload( this.oUrlParams, this.aUrlOptions, this.oCurrentModule ); }, this );
		} else if ( this.oCurrentModule ) {
			this.oCurrentModule.reload( this.oUrlParams, this.aUrlOptions );
		}
	},
	loadModule : function ( newModule ) {
		if ( !newModule ) {
			console.log('cannot require module');
		} else {
			newModule.load( this.oUrlParams, this.aUrlOptions, this.oLoadingModule );
		}
	},
	unloadModule : function () {

	},
	onModuleRequire : function ( oRequiredModule ) {
//			debugger;
	// if required module is the same as current one
		if (
			 this.oCurrentModule &&
			 this.oCurrentModule.sName == oRequiredModule.sName &&
			 ( !this.aModulesToLoad.length ||
			 this.aModulesToLoad[ this.aModulesToLoad.length - 1 ] == oRequiredModule.sName ) ) {
			return this.reloadModule();
		}
	// if required module is not in loading stack or there's no stack at all
		if ( !this.aModulesToLoad.length || _.indexOf( this.aModulesToLoad, oRequiredModule.sName ) == -1 ) {
		// this is not module that we need to load - "quick click" situation, break loading and refresh stack
			if ( this.oLoadingModule ) {
				this.oLoadingModule.stopLoad();
			}
			if ( this.oCurrentModule ) {
				this.oCurrentModule.hide();
				this.oCurrentModule.unload();
				this.oCurrentModule = null;
				if ( _.keys( this.oRequiredModules ).length > 1 ) {
					// hide parent modules
					for (var i = this.aModulesToShow.length-1; i >= 0; i--) {
						this.oRequiredModules[ this.aModulesToShow[i] ].hide();
						this.oRequiredModules[ this.aModulesToShow[i] ].unload();
					}
				}
			}
			this.oRequiredModules = {};
			this.oLoadedModules = {};
		// resetting load stack
			this.aModulesToLoad = [ oRequiredModule.sName ];
			this.aModulesToShow = [ oRequiredModule.sName ];
			this.oLoadingModule = oRequiredModule;
			oModuleLoadingBus.reset( this, oRequiredModule );
		} else {
		// module name present in load stack
			/** TODO consider this else */
//				this.aModulesToLoad.unshift( oRequiredModule.sName );
		}

		this.oRequiredModules[ oRequiredModule.sName ] = oRequiredModule;
		oModuleLoadingBus.fire( oRequiredModule );

		if ( oRequiredModule.aRequiredModules.length || oRequiredModule.sParentModule ) {
			if ( oRequiredModule.aRequiredModules.length ) {
				var oCModule = null;
				_.each( oRequiredModule.aRequiredModules, _.bind( function (x) {
					oCModule = this.getModuleByName( x );
					if ( x && oCModule ) {
						this.aModulesToLoad.unshift( x );
						this.aModulesToShow.unshift( x );
						this.requireModule( { object : oCModule }, this.onModuleRequire );
					}
				}, this ) );
			}

			if ( oRequiredModule.sParentModule ) {
			// need to load parent
			// find parent module
				var oParent = this.getModuleByName( oRequiredModule.sParentModule );
				if ( oParent ) {
					this.aModulesToLoad.unshift( oRequiredModule.sParentModule );
					this.aModulesToShow.unshift( oRequiredModule.sParentModule );
					this.requireModule( { object: oParent }, this.onModuleRequire );
				}
			}
		} else {
//				var z = this.aModulesToLoad.pop();
//				console.log('Loading ', z);
//				this.loadModule( oRequiredModule );
		}

	},

	startModulesLoad : function () {
		this.loadModule( this.oRequiredModules[ this.aModulesToLoad.pop() ] );
	},
	onModuleLoad : function () {

		if ( !this.aModulesToLoad.length && this.oLoadingModule ) {
			this.oCurrentModule = this.oLoadingModule;
			this.oLoadingModule = null;
			this.drawPage();
		} else if ( this.aModulesToLoad.length ) {
			var z = this.aModulesToLoad.pop();
			this.loadModule( this.oRequiredModules[ z ] );
		}
	},

	drawPage : function () {
		// get layout
		var oLayout = window.LayoutManager.getLayout( this.oCurrentModule.getLayoutName() );
		if ( oLayout ) {
			_.each(this.aModulesToShow, _.bind( function (x) {
				this.oRequiredModules[x].show( x == this.oCurrentModule.sName );
			}, this) );
			oLayout.render();
			_.each(this.aModulesToShow, _.bind(function(x){
				this.oRequiredModules[x].oView.onAfterAppend();
			}, this));
		}

	},

	getModuleByUrl : function ( sUrl ) {
		var aUrl = sUrl.split('/');
		if ( aUrl.length ) {
			aUrl = _.filter( aUrl, function (x) { return x.length; } );
		}
		var cModule = this.searchModule( aUrl, this.oRoutes );
		return  cModule || { object :  this.oRoutes[ sDefaultModule ], params : {} };
	},
	getModuleByName : function ( sName ) {
		var f = function ( sName, oObj ) {
			if ( oObj.hasOwnProperty(sName) ) {
				return oObj[sName];
			} else {
				var cm = false;
				for ( var i in oObj ) if ( oObj.hasOwnProperty( i ) ) {
					if ( _.isObject( oObj[ i ] ) ) {
						cm = f( sName, oObj[i] );
						if ( cm ) {
							return cm;
						}
					}
				}
			}
			return false;
		};
		return f( sName, this.getRoutes() );
	},
	getModuleByPath : function ( sPath ) {
		var c = null;
		var f = function ( oObj ) {
			for ( var i in oObj ) if ( oObj.hasOwnProperty(i) ) {
				if ( _.isObject(oObj[i]) ) {
					if ( oObj[i]['__path'] == sPath ) {
						return oObj[i];
					}
					c = f(oObj[i]);
					if ( c ) {
						return c;
					}
				}
			}
			return false;
		};
		return f( this.getRoutes() );
	},
	searchModule : function ( aUrl, coModule, oParams ) {
		if (!oParams) {
			oParams = {};
		}
		var cUrl = aUrl.shift(), bFound;
		for ( var i in coModule ) if ( coModule.hasOwnProperty(i) ) {
			if ( i.indexOf('pcre:') == 0 ) {
				// regexp
				var ci = new RegExp( '^' + i.substr(5) + '$', 'i' );
				if ( cUrl.toString().match(ci) ) {
					bFound = true;
					oParams[ coModule[i].hasOwnProperty('__name') ? coModule[i]['__name'] : coModule[i]['__path'] ] = cUrl;
					break;
				}
			} else {
				if ( i == cUrl ) {
					if ( coModule[i].hasOwnProperty('__name') ) {
						oParams[ coModule[i]['__name'] ] = cUrl;
					}
					bFound = true;
					break;
				}
			}
		}
		if ( bFound ) {
			if ( aUrl.length ) {
				return this.searchModule( aUrl, coModule[i], oParams );
			} else {
				return { 'object' : coModule[i], 'params' : oParams };
			}
		} else {
			return null;
		}
	},
	getRoutes : function () {
		return require('json!./routes.json');
	},

	initialize : function ( sInitUrl ) {
		this.oRoutes = this.getRoutes();
		if ( sInitUrl && typeof sInitUrl == 'string' ) {
			document.cookie = 'login_location=;path=/';
			document.location.hash = ( sInitUrl.match(/^!/) ? '' : '!' ) + sInitUrl;
		}
		window.App.bindEvent('module:ready', this.onModuleLoad, this);
		window.App.bindEvent('common:set-url-option', function ( i, v) {
			this.changeUrlOptions( i,v );
		}, this);
	},
	changeUrlOptions : function ( i, value ) {
		if ( ! this.oCurrentModule ) {
			return;
		}
		if ( _.isArray(i) ) {
			_.each(i, function ( aVals ) {
				if ( _.isNumber(aVals[0]) ) {
					this.aUrlOptions[aVals[0]] = aVals[1];
				}
			}, this);
		} else if ( _.isNumber(i) ) {
			this.aUrlOptions[i] = value;
		}
		this.oCurrentModule.setOptions( this.aUrlOptions );
		this.navigate( (!this.sUrl.match(/^!/) ? '!' : '') + this.sUrl + '|' + this.aUrlOptions.join('|') );
	},
	goToUrl : function ( sUrl ) {
		if ( sUrl == document.location.hash ) {
			return;
		}
		document.location.hash = sUrl;
	},
	getUrlParams : function () {
		return this.oUrlParams;
	},
	getCurrentUrl : function () {
		return this.sUrl;
	},
	getDomain : function () {
		return '/';
	}
});
var initialize = function ( sInitUrl ) {
	var app_router = new AppRouter( sInitUrl );
	Backbone.history.start();
	return app_router;
};

module.exports = { initialize : initialize };