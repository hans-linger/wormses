var K = Kinetic;

var RING_COUNT = 6;

/*****************************************************************************
 * @param oWorld
 * @param oParams
 *****************************************************************************/
var Meatball = function ( oWorld, oParams ) {

	if (!oParams) { oParams = {}; }
	this.id = _.uniqueId('meatball_');
	this.x = oParams.x || ( 100 + Math.random()*(oWorld.iWidth - 200) );
	this.y = oParams.y || ( 100 + Math.random()*(oWorld.iHeight - 200) );
	this.value = oParams.value || Math.round( 10 + Math.random() * 10 );
	this.r = this.value;
	this.aRings = [ ];

	var seed = 1 + Math.floor( Math.random()*3 );
	switch (seed) {
		case 0:
		default:
			this.type = this.TYPE_LENGTH;
			this.color = '#0f0';
			break;

		case 1:
			this.type = this.TYPE_WIDTH;
			this.color = '#00f';
			break;

		case 2:
			this.type = this.TYPE_POWER;
			this.color = '#f00';
			break;
	}
	this.color = oParams.color || this.color;

	var that = this;
	this.oShape = new K.Shape({
		drawFunc : function( canvas ) {
			var context = canvas.canvas.getContext();
			var rg = context.createRadialGradient( that.x, that.y, 0, that.x, that.y, that.r );
			rg.addColorStop(0, 'black');
			rg.addColorStop(1, that.color);
			context.setAttr( 'strokeStyle', rg );

			_.each( that.aRings, function( iRing ){
				context.beginPath();
				context.arc( that.x, that.y, that.r * iRing, 0, 2 * Math.PI, false);
				context.stroke();
			});

		}
	});

	this.getTypeColor = function () {

	};
	this.getCoords = function () {
		return { x : this.x, y : this.y };
	};
	this.getShape = function () {
		return this.oShape;
	};
	this.calcRings = function( phase ) {
		if ( !phase ) {
			phase = 0;
		}
		var newRings = [];
		for ( var i = 0; i < RING_COUNT; i++ ) {
			newRings[i] =  ( 1 - Math.sin(( phase - (RING_COUNT - i)*2000)/2000) * 0.9 );
		}
		this.aRings = newRings;
	};
	this.live = function( oWorld, frame ) {
		this.r = this.value * ( 1 + Math.sin(frame.time/250)*0.1 );
		this.calcRings( frame.time );
	};
	this.calcRings();
};
Meatball.prototype.TYPE_LENGTH = 1;
Meatball.prototype.TYPE_WIDTH = 2;
Meatball.prototype.TYPE_POWER = 3;

module.exports = Meatball;