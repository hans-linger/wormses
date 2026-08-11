// there is a weird mousemove bug in npm kinetic package so...
require('script!../kinetic');

var K = Kinetic;

var Worm = require('./worm'),
	Meatball = require('./meatball'),
	Egg = require('./egg'),
	helpers = require('./helpers');

var World = function ( container ) {
	this.Container = container;
	this.Width = 0;
	this.Height = 0;
	this.oStage = null;
	this.oWormLayer = new K.Layer();
	this.oWorms = {};
	this.oEggs = {};
	this.oMeatballs = {};
	this.oWormAnimation = null;
	this.oAxisLayer = null;
	this.oMeatLayer = null;
	this.bLiving = false;
	this.oCurrentFrame = null;

	this.init = function () {
		this.iWidth = Math.max( this.Container.offsetWidth, 100 );
		this.iHeight = Math.max( this.Container.offsetHeight, 100 );
		this.oStage = new K.Stage({
			container : container,
			width: this.iWidth,
			height: this.iHeight
		});
		this.oMouse = { x : this.iWidth/2, y : this.iHeight/2 };
		// this.drawAxes( this.oStage );
		// this.drawHelpers( this.oStage );
		this.bindEvents();
		this.drawMeatballs( this.oStage );
		this.drawWorms();
	};
	this.drawMeatballs = function ( oStage ) {
		this.oMeatLayer = new K.Layer();

		for (var i = 0, cMeatball; i++ < 20; ) {
			this.addMeatball();
		}
		oStage.add( this.oMeatLayer );
	};
	this.addMeatball = function ( ) {
		var cMeatball = new Meatball( this );
		this.oMeatballs[ cMeatball.id ] = cMeatball;
		this.oMeatLayer.add( cMeatball.getShape() );
	};
	this.drawWorms = function ( ) {
		for ( var i = 0; i++ < 2; ) {
			this.addWorm(50 + Math.random() * ( this.iWidth - 50 ), 50 + Math.random() * ( this.iHeight - 50 ));
		}
		this.addRandomEgg();
		this.addRandomEgg();
		this.oStage.add( this.oWormLayer );
		var that = this;
		this.oWormAnimation = new K.Animation(function (frame) { that.live(frame); }, this.oWormLayer);
		this.start();
	};
	this.addRandomEgg = function() {
		this.addEgg( 50 + Math.random() * ( this.iWidth - 50 ), 50 + Math.random() * ( this.iHeight - 50 ), this.oCurrentFrame ? this.oCurrentFrame.time : 0 );
	};
	this.addWorm = function( x, y ) {
		var cWorm = new Worm({
			color : helpers.generateWormColor(),
			strokeWidth: 1 + Math.random()*2,
			width: 4 + Math.random()*5,
			length : 15 + Math.random()*10
		});
		cWorm.x = x;
		cWorm.y = y;
		cWorm.oShape.on('mouseover', function () {
			document.title = cWorm.iLength + '/' + cWorm.iWidth + ' (' + cWorm.iMaxVelocity + ')';
		});
		cWorm.oShape.on('mouseout', function () {
			document.title = 'worms';
		});
		this.oWormLayer.add( cWorm.oShape );
		this.oWorms[ cWorm.sId ] = cWorm;
	};
	this.addEgg = function( x, y, time ) {
		var oEgg = new Egg(x, y, time);
		this.oWormLayer.add( oEgg.oShape );
		this.oEggs[ oEgg.sId ] = oEgg;
	};
	this.start = function () {
		this.oWormAnimation.start();
		this.bLiving = true;
	};
	this.stop = function () {
		this.oWormAnimation.stop();
		this.bLiving = false;
	};
	this.switchLiving = function () {
		return this[ this.bLiving ? 'stop' : 'start' ]();
	};

	this.bindEvents = function () {
		var that = this, cx, cy;
		this.oContainerPos = $( this.Container ).offset();
		$( this.Container ).on('mousemove', function (e) {
			cx = e.clientX - that.oContainerPos.left;
			cy = e.clientY - that.oContainerPos.top + document.documentElement.scrollTop;
			that.handleMouseMove(cx, cy);
		});
		$( this.Container ).on('click', function (e) { that.switchLiving(); });
	};

	this.handleMouseMove = function (x, y) {
		this.oMouse = { x : x, y : y };
		if ( this.oHelperLayer ) {
			var ca, cx, cy;
			ca = -Math.atan2( 300 - y, 400 - x );
			cx = 100 * Math.cos( Math.PI/2 - ca );
			cy = 100 * Math.sin( Math.PI/2 - ca );
			this.oHelperLine1.setPoints([ this.iWidth/2, this.iHeight/2, x, y ]);
			this.oHelperLine2.setPoints([ this.iWidth/2 - cx, this.iHeight/2 - cy, this.iWidth/2 + cx, this.iHeight/2 + cy ]);
			this.oHelperLayer.draw();
		}
	};

	this.hatch = function( oEgg ) {
		this.addWorm(oEgg.x, oEgg.y);
		oEgg.oShape.hide();
		delete this.oEggs[ oEgg.sId ];
	};

	this.live = function ( frame ) {
		this.oCurrentFrame = frame;
		_.each( this.oWorms, _.bind( function (x) {
			x.calculateLines( frame );
			x.live( this, frame );
		}, this ) );
		_.each( this.oMeatballs, _.bind(function(x){
			x.live( this, frame);
		}, this));
		_.each( this.oEggs, _.bind(function(x){
			x.live( this, frame);
		}, this));
		this.oMeatLayer.draw();
//			document.title = 'FPS: ' + Math.round( 10000/frame.timeDiff ) / 10;
	};
	this.drawAxes = function ( oStage ) {
		this.oAxisLayer = new K.Layer();
		var oAxisX = new K.Line({
			points : [ 0, this.iHeight/2, this.iWidth, this.iHeight/2 ],
			strokeWidth : 1,
			stroke : '#222'
		});
		var oAxisY = new K.Line({
			points : [ this.iWidth/2, 0, this.iWidth/2, this.iHeight ],
			strokeWidth : 1,
			stroke : '#222'
		});
		this.oAxisLayer.add(oAxisX);
		this.oAxisLayer.add(oAxisY);
		oStage.add(this.oAxisLayer);
	};
	this.drawHelpers = function ( oStage ) {
		this.oHelperLayer = new K.Layer();
		this.oHelperLine1 = new K.Line({
			points : [ this.iWidth/2, this.iHeight/2, this.iWidth/2 + 200, this.iHeight/2 ],
			stroke : '#f00',
			strokeWidth : 1
		});
		this.oHelperLine2 = new K.Line({
			points : [ this.iWidth/2, this.iHeight/2 + 100, this.iWidth/2, this.iHeight/2 - 100 ],
			stroke : '#f00',
			strokeWidth : 1
		});
		this.oHelperLayer.add( this.oHelperLine1 );
		this.oHelperLayer.add( this.oHelperLine2 );
		oStage.add(this.oHelperLayer);
	};
};

module.exports = World;