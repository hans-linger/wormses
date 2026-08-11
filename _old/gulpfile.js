var gulp = require('gulp'),
	webpack = require('webpack'),
	watch = require('gulp-watch');

gulp.task('default', function() {
	gulp.start('webpack', function() {

	});
	gulp.start('watch');
});

gulp.task("webpack", function(callback) {
	// run webpack
	webpack(require('./webpack.config'), function(err, stats) {
		callback();
	});
});

gulp.task('watch', function(){
	gulp.watch([ './src/**', './*.js', './src/**.scss'], function(){
		gulp.start('webpack', function(){
			console.log('-- rebuilt --');
		});
	});
});