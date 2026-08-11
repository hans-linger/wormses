var K = Kinetic;

var HATCH_TIME = 3000;
var HATCH_ANIMATION_TIME = 200;
var Egg = function( x, y, time ) {
	this.oShape = null;
	this.sColor = '#fff';
	this.iStrokeWidth = 1;
	this.x = x;
	this.y = y;
	this.time = time || 0;
	this.r = 4 + Math.random()*3;
	this.DOT_COUNT = Math.ceil( 6 + Math.random() * 3 );
	this.LINE_COUNT = Math.ceil( 5 + Math.random() * 3 );
	this.aDots = [];
	this.aLines = [];
	this.HATCH_TIME = HATCH_TIME + Math.random() * HATCH_TIME * 2;
	this.isHatching = false;
	this.hatchBeginTime = 0;

	this.init = function() {
		var that = this;
		this.sId = _.uniqueId('egg_');

		this.generateDots();
		this.calcRings();

		this.oShape = new K.Shape({
			drawFunc : function ( canvas ) {
				var context = canvas.canvas.getContext();
				context.setAttr( 'strokeStyle', that.sColor );
				context.setAttr( 'lineWidth', that.iStrokeWidth  );
				context.setAttr( 'lineCap' , 'round' );
				var cDots = [];
				_.each( that.aLines, _.bind(function(line){
					context.moveTo(this.x + this.r * this.aDots[0][0] * line, this.y + this.r * this.aDots[0][1] * line );
					context.beginPath();
					for ( var i = 0; i < this.aDots.length; i++ ) {
						context.lineTo( this.x + this.r * line * this.aDots[i][0], this.y + this.r * this.aDots[i][1] * line );
					}
					context.lineTo(this.x + this.r * this.aDots[0][0] * line, this.y + this.r * this.aDots[0][1] * line );
					context.stroke( context );
				}, that));
			}
		});
	};
	this.generateDots = function(){
		this.aDots = [0];
		for ( var i = 0; i < this.DOT_COUNT; i++ ) {
			this.aDots.push(Math.random() * Math.PI * 2);
		}
		this.aDots.sort();
		this.aDots = _.map( this.aDots, function(x) { return  [ Math.sin(x), Math.cos(x) ] });
	};
	this.generateLines = function( phase ){
		this.aLines = [];
		for ( var i = 0, prevLine = this.r, cLine; i < this.LINE_COUNT; i++ ) {
			cLine = prevLine * ( 1 - 0.5*Math.random() );
			this.aLines.push( cLine );
			prevLine = cLine;
		}
		console.log('--lines', this.aLines);
	};
	this.calcRings = function( phase ) {
		if ( !phase ) {
			phase = 0;
		}
		var newRings = [];
		for ( var i = 0; i < this.LINE_COUNT; i++ ) {
			newRings[i] =  ( 1 - Math.sin(( phase - (this.LINE_COUNT - i)*300)/(300 + Math.random()*10)) * 0.9 );
		}
		this.aLines = newRings;
	};
	this.live = function( world, frame ) {
		this.calcRings(frame.time);
		this.r *= this.isHatching ? 1.4 : 1.0038;
		if ( !this.isHatching && frame.time - this.time > this.HATCH_TIME ) {
			this.isHatching = true;
			this.hatchBeginTime = frame.time;
		} else if ( this.isHatching ) {
			if ( frame.time - this.hatchBeginTime > HATCH_ANIMATION_TIME ) {
				// do hatch
				world.hatch( this );
			}
		}
	};

	this.init();
};

module.exports = Egg;