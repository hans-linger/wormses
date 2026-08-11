var WormLine = require('./wormLine'),
	Meatball = require('./meatball'),

	K = Kinetic,

	LIFETIME = 60000,
	MAX_LENGTH = 37,
	
	DYING_TIME = 3000;

/*****************************************************************************
 * @param oParams
 *****************************************************************************/
var Worm = function ( oParams ) {
	this.oShape = null;
	this.iLength = oParams.length || 50;
	this.iWidth = oParams.width || 10;
	this.sColor = oParams.color || '#fff';
	this.iStrokeWidth = oParams.strokeWidth || 1;
	this.oLines = {};
	this.iAngle = 0;
	this.iVelocity = 0;
	this.x = 400;
	this.y = 300;
	this.oCurrentTarget = null;
	this.iMaxVelocity = 2;
	this.MAX_LENGTH = MAX_LENGTH + MAX_LENGTH*Math.random()*3;

	this.dyingStartTime = 0;
	this.isDying = false;
	
	var dA = 4 * Math.PI / 360;

	var iCalcSteps = 2;


	this.init = function () {
		var that = this, d = [];
		this.sId = _.uniqueId('worm_');
		this.oShape = new K.Shape({
			drawFunc : function ( canvas ) {
				var context = canvas.canvas.getContext();
				context.setAttr( 'strokeStyle', that.sColor );
				context.beginPath();
				context.setAttr( 'lineWidth', that.iStrokeWidth  );
				context.setAttr( 'lineCap' , 'round' );
				_.each( that.oLines, function (x) {
					d = x.calc(that.isDying);
					context.moveTo( d[0], d[1] );
					context.lineTo( d[2], d[3] );
				});
				context.stroke( context );
				// debug
				if ( 0 ) {
					context.setAttr( 'lineWidth', 1 );
					context.setAttr( 'font', '20px sans-serif' );
					context.strokeText('L: ' + Math.round( that.iLength ), that.x, that.y);
				}
			},
			drawFunc2 : function ( context ) {
				_.each( that.oLines, function (x) {
					d = x.calc();
					context.beginPath();
					context.strokeStyle = '#00f';
					context.arc( x.x, x.y, 2, 0, Math.PI*2, false );
					context.stroke();
				});

			}
		});
	};
	this.getTargetDistance = function () {
		if ( this.oCurrentTarget ) {

		} else {
			return 0;
		}
	};
	this.getTarget = function ( oWorld ) {
		if ( !this.oCurrentTarget || !oWorld.oMeatballs[this.oCurrentTarget.id] ) {
			var r = _.shuffle(oWorld.oMeatballs);
			for ( var i in r ) if (r.hasOwnProperty(i)) {
				this.oCurrentTarget = r[i];
				break;
			}
//				this.oCurrentTarget = _.first( oWorld.oMeatballs );
		}
		var cc = this.oCurrentTarget.getCoords();
		var dist = Math.sqrt( Math.pow( this.x - cc.x, 2 ), Math.pow( this.y - cc.y ) );
		return this.oCurrentTarget;
	};
	this.eat = function ( oWorld ) {
		if ( this.oCurrentTarget ) {
			switch ( this.oCurrentTarget.type ) {
				case Meatball.prototype.TYPE_LENGTH:
				default:
					this.iLength += this.oCurrentTarget.value/2;
					break;
				case Meatball.prototype.TYPE_WIDTH:
					this.iWidth += this.oCurrentTarget.value/3;
					break;
				case Meatball.prototype.TYPE_POWER:
					this.iMaxVelocity += this.oCurrentTarget.value/32;
					break;
			}

			this.oCurrentTarget.oShape.hide();

			delete oWorld.oMeatballs[this.oCurrentTarget.id];
			this.oCurrentTarget = null;
			// if ( Math.random() > 0.2 ) {
			oWorld.addMeatball();
			// }


		}
	};
	this.live = function ( oWorld, iFrame ) {

		if ( this.isDying ) {
			this.iVelocity -= this.iVelocity * ( ( iFrame.time - this.dyingStartTime ) / DYING_TIME );
			this.oShape.setOpacity( 1 + ( this.dyingStartTime - iFrame.time ) / DYING_TIME );
			if ( iFrame.time - this.dyingStartTime > DYING_TIME ) {
				this.die( oWorld );
			}
			return;
		}

		// get target
		var oTarget = this.getTarget( oWorld ), oTargetCoords;
		if ( !oTarget ) {
			oWorld.stop();
			oTargetCoords = {
				x : 50 + Math.random()*(oWorld.iWidth-100),
				y : 50 + Math.random()*(oWorld.iHeight-100)
			};
		} else {
			oTargetCoords = this.oCurrentTarget.getCoords();
		}

		var iDist = Math.sqrt( Math.pow( this.x - oTargetCoords.x, 2 ) + Math.pow(  this.y - oTargetCoords.y, 2 ) );
		if (isNaN(iDist)) {
			iDist = 0;
		}
		if ( iDist < 10 ) {
			this.eat( oWorld );
			return;
		}
		this.oShape.setOpacity( 0.8 + Math.abs( Math.sin(iFrame.time/( this.isDying ? 50 : 300 )) )*0.2 );
		this.iVelocity = Math.min( this.iMaxVelocity, iDist * 0.04 ) * ( 1 + Math.sin(iFrame.time/100) );

		var iAngle = -Math.atan2( this.y - oTargetCoords.y, this.x - oTargetCoords.x ) ;

		if (isNaN(iAngle)) {
			iAngle = 0;
		}

		var deltaA = this.iAngle - iAngle;
		if ( Math.abs( deltaA ) > dA ) {
			if ( deltaA < -Math.PI ) {
				this.iAngle += Math.PI*2;
			} else if ( deltaA > Math.PI ) {
				this.iAngle -= Math.PI*2;
			}
			this.iAngle += ( this.iAngle > iAngle ? -1 : 1 ) * dA;
		} else {
			this.iAngle = iAngle;
		}

		var cVelocity = this.iVelocity;
		if ( this.x < 100 ) {
			this.iVelocity *= 0.5* this.x/100;
		}
		if ( this.y < 100 ) {
			this.iVelocity *= 0.5* this.y/100;
		}
		if ( this.x > oWorld.iWidth - 100 ) {
			this.iVelocity *= 0.5* (oWorld.iWidth - this.x )/100;
		}
		if ( this.y > oWorld.iHeight - 100 ) {
			this.iVelocity *= 0.5* (oWorld.iHeight - this.y )/100;
		}
		if ( iDist < 50 ) {
			cVelocity*= 0.4;
		}
		if ( iDist > 1 ) {
			this.x += this.iVelocity * Math.sin( this.iAngle - Math.PI/2);
			this.y += this.iVelocity * Math.cos( this.iAngle - Math.PI/2);
		}

		if ( this.iLength > this.MAX_LENGTH ) {
			this.startDying( oWorld);
		}

	};
	/**
	 * calc function
	 * @param ci
	 * @param iFrame
	 */
	this.fY = function ( ci, iFrame ) {
		var y = 0;
		// гармоника формы
		y+= Math.abs( Math.sin( Math.PI * ci/(this.iLength)  ) ) * this.iWidth;
		// гармоника утолщения ебала
		y+= Math.pow( ci+this.iLength/10, 1.4-ci/this.iLength );
		// гармоника отвратительных колыханий туловища
		y+= Math.abs( Math.sin( ( (iFrame.time - ci*10))/200 ) ) * (this.iVelocity + ( ci )/10);
		return Math.abs( y );
	};
	this.calculateLine = function ( i, iFrame ) {

		if ( i == 0 ) {
			this.oLines[0].x = this.x;
			this.oLines[0].y = this.y;
			this.oLines[0].iAngle = this.iAngle - Math.PI/2;
		} else {
			this.oLines[i].setAngle( this.iAngle - Math.PI/2 );
		}
//			document.title = iAngle;
		for (var j = 0, cmax = 0, ci; j < iCalcSteps; j+= 1 ) {
			ci = i + j;
			cmax = Math.max( cmax, this.fY(ci, iFrame) ) ;
		}
		this.oLines[i].setWidth( cmax );
//			this.oLines[i].setAngle( iAngle );
	};
	this.calculateLines = function ( iFrame ) {
		for ( var i = 0; i < this.iLength; i++ ) {
			if ( !this.oLines[i] ) {
				this.oLines[i] = this.createLine( i, i > 0 ? this.oLines[i-1] : null );
			}
			this.calculateLine( i, iFrame );
		}
	};
	this.createLine = function ( i, oPrevLine ) {
		if ( oPrevLine ) {
			return new WormLine({ i : i, prev : oPrevLine });
		} else {
			return new WormLine({ i : i, x : this.x, y : this.y, a : this.iAngle });
		}
	};
	this.startDying = function( oWorld ) {
		this.dyingStartTime = oWorld.oCurrentFrame.time;
		this.isDying = true;
	};
	this.die = function( oWorld ) {
		oWorld.addRandomEgg();
		this.oShape.hide();
		delete oWorld.oWorms[ this.sId ];
	};


	this.init();
};

module.exports = Worm;