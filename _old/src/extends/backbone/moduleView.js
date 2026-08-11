Backbone.ModuleView = Backbone.View.extend({
	el : '<div class="moduleContent"></div>',
	bRendered : false,
	aOptions : [],
	oLayout : { 'main' : 'main' },
	show : function ( aOptions ) {
		this.showMinor( aOptions );
		$( 'body:first' ).addClass( 'module-' + window.App.getCurrentModuleName() );
	},
	showMinor : function ( aOptions ) {
		this.render.apply(this, [ aOptions ]);
		this.aOptions = aOptions;
		window.LayoutManager.drawSection( this.oLayout, this.$el );
		this.trigger('show');
	},
	hide : function () {
		this.$el.remove();
		$( 'body:first' ).removeClass( 'module-' + window.App.getCurrentModuleName() );
		this.trigger('hide');
	},
	refresh : function ( aOptions ) {
		this.onBeforeRefresh();
		this.show( aOptions );
		this.onAfterRefresh();
	},
	onAfterRefresh : function () {},
	onBeforeRefresh : function () {
		this.$el.remove();
		this.bRendered = false;
		return this.model;
	},
	getLayoutName : function () {
		return this.sLayout;
	},
	render : function () {

	},
	onAfterAppend : function() {

	}
});