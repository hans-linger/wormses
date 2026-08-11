var tTemplate = require('raw!../t/index.html');
var ww = require('./worms/world');
require('!style!css!sass!../t/style/index.scss');

module.exports = Backbone.ModuleView.extend({
	template : _.exTemplate( tTemplate ),
	initialize : function () {

	},
	render : function () {
		this.setElement( this.template( this.model.toJSON() ) );
	},
	onAfterAppend : function() {
		var worms = new ww( this.el );
		worms.init();
	}
});