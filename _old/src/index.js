require('!style!css!sass!./style/common.scss');
require('./extends');

window.App = require('./app')();
(function($){$(function(){
	window.App.initialize();
})})(jQuery);
