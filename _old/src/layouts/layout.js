var LayoutPrivate = {
	createSection : function ( sName, oOptions ) {
		this.oSections[ sName ] = new LayoutSection( this, oOptions );
	}
};
var Layout = function ( oOptions ) {
	this.oOptions = oOptions;
	this.oSections = {};
	this.bDrawn = false;

	this.init = function ( oOptions ) {
		this.$el = $( oOptions.template );
		var that = this;
		_.each( oOptions.sections, function ( x, n ) {
			LayoutPrivate.createSection.call(that, n, x);
		} );
	};

	this.drawSection = function ( sName, sContent ) {
		if ( this.oSections.hasOwnProperty( sName ) ) {
			this.oSections[ sName ].draw( sContent );
		}
	};

	this.render = function () {
		if ( !this.bDrawn ) {
			this.$el.appendTo( $('body:first') );
			this.bDrawn = true;
		}
	};

	this.hide = function () {
		this.hideSections();
		this.$el.remove();
	};

	this.hideSections = function () {
		_.each( this.oSections, function ( x ) { x.hide(); } );
	};

	this.appendTo = function ( sSectionName, sContent, sSelector ) {
		if ( this.oSections.hasOwnProperty( sSectionName ) ) {
			this.oSections[ sSectionName ].append( sContent, sSelector );
		}
	};

	this.init( oOptions );
};
var LayoutSection = function ( oLayout, oOptions ) {
	this.oOptions = {};
	this.$el = oLayout.$el.is( oOptions.s ) ? oLayout.$el : oLayout.$el.find( oOptions.s );

	this.draw = function ( $el ) {
		this.$el.html('').append( $el );
	};
	this.hide = function () {
		this.$el.children().remove();
	};
	this.append = function ( sContent, sSelector ) {
		if ( sSelector ) {
			if ( this.$el.is( sSelector ) ) {
				this.$el.html( sContent );
			} else {
				this.$el.find( sSelector ).html( sContent );
			}
		} else {
			this.$el.append( sContent );
		}
	};
};

module.exports = Layout;