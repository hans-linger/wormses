var helpers = {
	dec2hex : function dec2hex(n){
		n = parseInt(n); var c = 'abcdef';
		var b = n / 16; var r = n % 16; b = b-(r/16);
		b = ((b>=0) && (b<=9)) ? b : c.charAt(b-10);
		return ((r>=0) && (r<=9)) ? b+''+r : b+''+c.charAt(r-10);
	},
	generateWormColor : function generateWormColor() {
		var sum = 660;
		var f = function() {
			return helpers.dec2hex( Math.floor( 30 + ( sum/3 - Math.random()*(sum/3) ) ) );
		};
		return '#' + f() + f() + f();
	}
};

module.exports = helpers;