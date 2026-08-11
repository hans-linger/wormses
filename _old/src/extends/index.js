// extends
require('./backbone/module');
require('./backbone/moduleView');
require('./backbone/moduleModel');
require('./backbone/crossDomain');
require('./exTemplate');
require('./humanTime');
require('./extendedEvent');
require('./layoutManager');
require('./localeManager');
require('./jForm/jForm');

_.mixin({ getSimpleDateTime : function ( oDate ) {
	return oDate.getFullYear() + '-' + ( '0' + ( oDate.getMonth() + 1 ) ).substr(-2) + '-' + ( '0' + oDate.getDate() ).substr(-2) + ' ' + ( '0' + oDate.getHours() ).substr(-2) + ':' + ( '0' + oDate.getMinutes() ).substr(-2) + ':' + ( '0' + oDate.getSeconds() ).substr(-2);
}});