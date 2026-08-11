var proxiedSync = Backbone.sync;
Backbone.sync = function(method, model, options) {
	options || (options = {});
	if ( !options.crossDomain ) {
		options.crossDomain = true;
	}
	return proxiedSync(method, model, options);
};