var mModel = require('./m/mIndex');
var vView = require( './v/vIndex' );
module.exports = Backbone.Module.extend({
	sName : 'index',
	bindEvents : function () {
	},
	onBeforeLoad : function () {
		this.oView = new vView({ model : new mModel() });
	}
});
