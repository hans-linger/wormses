/*****************************************************************************
 * @param oParams
 *****************************************************************************/
module.exports = function ( oParams )
{
	var iDist = 5;
	var iDistBend = 0.4;

	this.id = oParams.i;
	this.x = oParams.x || 0;
	this.y = oParams.y || 0;
	this.iWidth = 0;
	this.iAngle = 0;
	this.oPrevLine = oParams.prev || null;
	this.aData = [];

	this.setWidth = function ( w ) {
		this.iWidth = w;
	};
	this.setAngle = function ( a ) {
		// cAngle = -Math.log((i + 1)/this.iLength )/5.57 * iAngle;
//			this.iAngle =  this.iAngle * 0.9 + ( this.iAngle - a )*0.1 ;
	};
	this.getAngle = function () { return this.iAngle; };
	this.calcFromPrev = function ( isDying ) {
//			this.iAngle += (this.oPrevLine.iAngle > this.iAngle ? 1 : -1) * Math.abs( this.iAngle - this.oPrevLine.iAngle ) * 0.1;
		var cDist;
		if ( this.x && this.y ) {
			cDist = Math.min( iDist * ( 1 + iDistBend ), Math.max( iDist * (1 - iDistBend), Math.sqrt( Math.pow( this.x - this.oPrevLine.x, 2 ) + Math.pow( this.y - this.oPrevLine.y, 2 ) ) ) );
			this.iAngle = -Math.atan2( this.y - this.oPrevLine.y, this.x - this.oPrevLine.x ) + Math.PI*3/2;
		} else {
			cDist = iDist;
			this.iAngle = this.oPrevLine.iAngle;
		}

		cDist -= 0.5* Math.abs(cDist - iDist);
		cDist = Math.max( cDist, iDist * (1 - iDistBend) );
		this.x = this.oPrevLine.x - cDist*Math.sin(this.iAngle );
		this.y = this.oPrevLine.y - cDist*Math.cos(this.iAngle );
	};
	this.calc = function ( isDying ) {
		if ( this.oPrevLine ) {
			this.calcFromPrev( isDying );
		}
		var res = [
			this.x - this.iWidth*Math.sin(Math.PI/2 - this.iAngle),
			this.y + this.iWidth*Math.cos(Math.PI/2 - this.iAngle),
			this.x + this.iWidth*Math.sin(Math.PI/2 - this.iAngle),
			this.y - this.iWidth*Math.cos(Math.PI/2 - this.iAngle)
		];
		if ( isDying ){
			res = _.map(res, function(x){ return x * (1 - Math.random() * 0.01) });
		}
		return res;
	};

};
