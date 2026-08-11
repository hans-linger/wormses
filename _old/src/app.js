var Router = require('./router');

module.exports = function ( oConfig ) {

	var f = function() {
		// router
		this.oRouter = {};

		// event target
		this.oEventTarget = _.extend({}, Backbone.Events);

		// bind special events

		// sidebar blocks
//		this.oSidebarBlocks = { oBlocks : {}, oViews : {} };

		// init
		this.initialize = function (sInitUrl) {
			this.oEventTarget.on('all', function () {
				//noinspection JSCheckFunctionSignatures
				window.App.logEvent( arguments );
			});
			this.oRouter = Router.initialize(sInitUrl);
		};
		this.logEvent = function ( event ) {
			console.info('EVENT (' + event[0] + '): ', _.tail( event ) );
		};

		this.bindOne = function (sEventName) {
			this.oEventTarget.one.apply(this.oEventTarget, _.toArray(arguments));
		};

		this.bindEvent = function (sEventName) {
			this.oEventTarget.bind.apply(this.oEventTarget, _.toArray(arguments));
		};

		this.triggerEvent = function () {
			this.oEventTarget.trigger.apply(this.oEventTarget, _.toArray(arguments));
		};

		this.unbindEvent = function () {
			this.oEventTarget.unbind.apply(this.oEventTarget, _.toArray(arguments));
		};

		this.goToUrl = function (sUrl, bFast) {
			this.oRouter.goToUrl(sUrl);
		};

		this.getCurrentModuleName = function () {
			var o = this.oRouter ? this.oRouter.oCurrentModule || this.oRouter.oLoadingModule : null;
			return o ? o.sName : '';
		};

		this.getUrlParams = function () {
			return this.oRouter ? this.oRouter.getUrlParams() : {};
		};

		this.getCurrentUrl = function () {
			return this.oRouter ? this.oRouter.getCurrentUrl() : '';
		};

		this.getDomain = function () {
			return this.oRouter.getDomain();
		};
	};
	return new f(oConfig);
};