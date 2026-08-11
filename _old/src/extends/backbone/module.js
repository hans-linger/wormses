var oLoadedModules = {};
Backbone.Module = {

	sName: '',
	oModel: null,
	oView: null,
	bHasLocale: false,
	aEvents: [],
	sPollId: '',
	bReloading: false,
	bLoaded: false,
	sParentModule: '',
	aRequiredModules: [],
	sLayout: 'main',
	aOptions: [],

	init: function () {
	},

	bindEvents: function () {
	},
	unbindEvents: function () {
//			this.aEvents = _.uniq( this.aEvents );
		_.each(this.aEvents, function (aEvent) {
			window.App.unbindEvent(aEvent[0], aEvent[1]);
		});
		this.aEvents = [];
	},
	bindEvent: function (sEventName, oCallback, oContext) {
		this.aEvents.push([sEventName, oCallback]);
		window.App.bindEvent(sEventName, oCallback, oContext);
	},

	/**
	 * @param aOptions
	 */
	setOptions: function (aOptions) {
		this.aOptions = aOptions;
		this.bReloading = true;
		this.onOptionsChange();
	},

	prepareModelLoadParams: function () {
		return this.oParams;
	},

	/**
	 * TODO do it fuckin proper
	 */
	load: function (oParams, aOptions, oMainModule) {
		this.aEvents = [];
		this.oParams = oParams;
		this.aOptions = aOptions;
		this.oMainModule = oMainModule;
		this.onBeforeLoad();
		this.bindEvents();
		this.oView.model.bind('loaded', function () {
			window.App.triggerEvent('module:ready', this.sName);
			if (this.bReloading) {
				this.bReloading = false;
				this.onAfterReload();
			} else {
				this.bLoaded = true;
				this.onAfterLoad();
			}
		}, this);
		/**
		 * TODO throw context to dataManager
		 */
		var that = this;
		if (window.LocaleManager && this.bHasLocale !== false) {
			window.LocaleManager.load(this.bHasLocale === true ? this.sName : this.bHasLocale, function (oModule) {
				if (oModule.oView.model) {
					oModule.oView.model.load(that.prepareModelLoadParams(), oMainModule);
				} else {
					/** TODO ?? */
				}
			}, this);
		} else {
			this.oView.model.load(this.prepareModelLoadParams(), this);
		}
	},

	unload: function () {
		this.onBeforeUnload();
		window.App.triggerEvent('module:unload', this.sName);
		if (this.oModel) {
			this.oModel.unbind('loaded');
		}
		this.unbindEvents();
		this.onAfterUnload();
		this.bLoaded = false;
		if (this.sPollId) {
			window.LongPoll.unsubscribe(this.sName, this.sPollId);
		}
	},

	reload: function (oParams, aOptions, oMainModule) {
		/** TODO carefully rethink **/
//			console.log('Reloading', oParams, aOptions);
//			if ( !_.isEqual( this.oParams, oParams ) || !_.isEqual( this.aOptions, aOptions ) ) {
		this.onBeforeReload();
		this.oParams = oParams;
		this.aOptions = _.clone(aOptions);
		this.bReloading = true;
		this.oView.model.load(this.prepareModelLoadParams(), oMainModule || this);
//			}
	},

	isReady: function () {
		return this.oModel.bLoaded;
	},

	onBeforeLoad: function () {
	},
	onBeforeUnload: function () {
	},
	onAfterLoad: function () {
//			this.oView.show( this.oModel, this.aOptions );
	},
	onBeforeReload: function () {
	},
	onAfterReload: function () {
		this.oView.refresh(this.oView.model, this.aOptions);
	},
	onAfterUnload: function () {

	},
	onOptionsChange: function () {
	},

	stopLoad: function () {
		this.unload();
	},
	show: function (bMain) {
		this.oView[bMain ? 'show' : 'showMinor'](this.aOptions);

	},
	hide: function () {
		this.oView.bRendered = false;
		this.oView.hide();
	},
	getLayoutName: function () {
		return this.sLayout || 'main';
	},

	extend: function (obj) {
		return _.extend({}, Backbone.Module, obj);
	}
};