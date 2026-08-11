'use strict';

var webpack = require('webpack');
module.exports = {
	entry : {
		app : './src/index.js',
		libs : [ 'jquery', 'backbone', 'lodash', './src/extends' ]
	},
	output : {
		path : __dirname + '/build',
		filename : 'index.js',
		publicPath : '/js/build/'
	},
	plugins : [

		new webpack.ProvidePlugin({
			$ : 'jquery',
			jQuery : 'jquery',
			Backbone : 'backbone',
			_ : 'lodash'
			//Underscore : 'lodash'
		}),
		new webpack.optimize.CommonsChunkPlugin( 'libs', 'libs.js'),
		new webpack.optimize.DedupePlugin(),
		new webpack.optimize.UglifyJsPlugin()
	]
};