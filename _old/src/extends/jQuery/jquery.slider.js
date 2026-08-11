(function($){

	var bIsTouch = ( 'ontouchstart' in window );
	var oConfig = {

	};
	var sDataName = 'jq-slider';
	var sPluginName = 'slider';

	var number_format = function ( number, decimals, dec_point, thousands_sep ) {
		number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
		var n = !isFinite(+number) ? 0 : +number,
			 prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
			 sep = (typeof thousands_sep === 'undefined') ? ' ' : thousands_sep,
			 dec = (typeof dec_point === 'undefined') ? ',' : dec_point,
			 s = '',
			 toFixedFix = function (n, prec) {
				 var k = Math.pow(10, prec);
				 return '' + Math.round(n * k) / k;
			 };
		// Fix for IE parseFloat(0.55).toFixed(0) = 0;
		s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
		if (s[0].length > 3) {
			s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
		}
		if ((s[1] || '').length < prec) {
			s[1] = s[1] || '';
			s[1] += new Array(prec - s[1].length + 1).join('0');
		}
		return s.join(dec);
	};

	var PluginMethods  = {

		/**
		 * initializing plugin
		 * @param oOptions
		 */
		init : function( oOptions ) {
			var oCurrentConfig = {};
			// if it's already inited, take current config
			if ( $(this).data( sDataName ) ) {
				oCurrentConfig = $(this).data( sDataName ).oOptions;
			}
			// overriding config params
			$.extend( oCurrentConfig, oConfig, oOptions || {} );
			if ( !$(this).data( sDataName ) ) {
				$(this).data( sDataName , new Plugin( $(this), oCurrentConfig ) );
			}
			$(this).data( sDataName ).init( oOptions );

		},

		destroy : function() {
			if ( $(this).data( sDataName ) ) {
				$(this).data( sDataName ).destroy();
			}
		},

		enable : function() {
			if ( $(this).data( sDataName ) ) {
				$(this).data( sDataName ).enable();
			}
		},

		disable : function() {
			if ( $(this).data( sDataName ) ) {
				$(this).data( sDataName ).disable();
			}
		}
	};


	var Plugin = function( $Node, oOptions ) {

		var that = this;
		var oConfig = {};

		this.oConfig = $.extend( oConfig, oOptions || {} );
		this.$Container = $();

	/**************************************** HELPERS *****************************/
	/**
	 * events array
	 */
		this._events = {
			'down': bIsTouch ? 'touchstart' : 'mousedown',
			'move': bIsTouch ? 'touchmove' : 'mousemove',
			'up': bIsTouch ? 'touchend' : 'mouseup'
		};
	/**
	 * Binding event
	 * @param $Target
	 * @param sEventName
	 * @param handler
	 */
		this._bind = function( $Target, sEventName, handler ){
			if( bIsTouch )
				$Target.get(0).addEventListener( this._events[ sEventName ], handler, false );
			else
				$Target.bind( this._events[ sEventName ], handler );
		};
	/**
	 * Unbinding event
	 * @param $Target
	 * @param sEventName
	 * @param handler
	 */
		this._unbind = function( $Target, sEventName, handler ){
			if( bIsTouch )
				$Target.get(0).removeEventListener ( this._events[ sEventName ], handler, false );
			else
				$Target.unbind( this._events[ sEventName ], handler );
		};

	/** templates **/
		var sSliderTemplate = '<div class="jq-slider"></div>';

	/**
	 * @var Scale
	 */
		this.oScale = null;
	/**
	 * @var ScaleSlider[]
	 */
		this.aSliders = [];
	/**
	 * @var SliderValue
	 */
		this.aSliderValues = [];
	// temporarily slider drag info
		this.oDragInfo = null;

		this.init = function() {
//			console.log( 'Slider config: ', this.oConfig );
//			console.log('Slider object', this);
			this.draw();
			this.bindEvents();
		};

		this.bindEvents = function () {
			this._bind( this.$Container.find('.slider'), 'down', this.onSliderPress );
		};

	/**
	 * slider press handler
	 * @param e Event
	 */
		this.onSliderPress = function ( e ) {
			e.preventDefault();
			e.stopPropagation();
			var oSlider = $(e.target).data('slider');
			var oNearest = that.getNearestSliders( oSlider.getValue() );
			var pageX = bIsTouch ? e.changedTouches[0].pageX : e.pageX;
			that.oDragInfo = {
				oSlider : oSlider,
				start : pageX,
				minLeft:  oNearest.min || 0,
				maxLeft : oNearest.max || 100,
				startValue : oSlider.getValue()
			};

			that._bind( $( document ), 'move', that.onSliderDrag );
			that._bind( $( document ), 'up', that.onSliderRelease );
		};
		/**
		 * slider drag handler
		 * @param e Event
		 */
		this.onSliderDrag = function ( e ) {
			// get value from mouse position
			var pageX = bIsTouch ? e.changedTouches[0].pageX : e.pageX;
			var iLeft = Math.max( that.oDragInfo.minLeft, Math.min( that.oDragInfo.maxLeft , that.oDragInfo.startValue + (pageX - that.oDragInfo.start) / that.oScale.$Node.width() * 100 ) );
			that.oDragInfo.oSlider.setValue( iLeft );
			that.updateScaleSelection();
			that.oDragInfo.oSlider.$Node.css('left', iLeft + '%');
			if ( that.oDragInfo.oSlider.oValueObject ) {
				that.oDragInfo.oSlider.oValueObject.setValue( Math.round( that.oScale.getValue( iLeft ) ) );
			}
		};
	/**
	 * slider release handler
	 * @param e Event
	 */
		this.onSliderRelease = function ( e ) {
			that.$Container.trigger( 'value:change', [ that.getValue() ] );
			that._unbind( $( document ), 'move', that.onSliderDrag );
			that._unbind( $( document ), 'up', that.onSliderRelease );
		};
		this.getValue = function (){
			var aValue = [];
			for ( var i = 0; i < this.aSliders.length; i++ ) {
				aValue.push( this.oScale.getValue( this.aSliders[i].getValue() ) );
			}
			return aValue;
		};
		this.getNearestSliders = function ( iValue ) {
			for ( var i = 0, iMin, iMax, cVal; i < this.aSliders.length; i++ ) {
				cVal = this.aSliders[i].getValue();
				if ( cVal < iValue && ( !iMin || cVal > iMin ) ) {
					iMin = cVal;
				}
				if ( cVal > iValue && ( !iMax || cVal < iMax ) ) {
					iMax = cVal;
				}
			}
			return { min : iMin, max : iMax };
		};

		this.drawScale = function () {
			this.oScale = new Scale( this.$Container, { ticks : this.oConfig.ticks, allowed : this.oConfig.allowed }, this.oConfig.$Values );
			this.oScale.draw();
		};
		this.updateScaleSelection = function () {
			this.oScale.updateSelection( this.aSliders[0].getValue(), this.aSliders[ this.aSliders.length - 1 ].getValue() );
		};

		this.drawSliders = function () {
			var that = this, cs = null, cv = null;
			$.each( this.oConfig.sliders, function ( i, oData ) {
				oData.value = that.oScale.getPosition( oData.value );
				cs = new ScaleSlider( that.$Container, oData, i );
				if ( cs ) {
					cv = new SliderValue( that.oScale.$ValuesContainer, { value : Math.round( that.oScale.getValue( oData.value ) ) }, i );

					that.aSliders.push( cs );
					if ( cv ) {
						cs.setValueObject( cv );
						cv.draw();
					}
					that.aSliderValues.push( cv );
				}
				cs.draw();
			});
		};

		this.draw = function () {
			this.$Container = $( sSliderTemplate );
			this.drawScale();
			this.drawSliders();
			this.updateScaleSelection();
			this.$Container.appendTo( $Node );
			/** TODO remove **/
			this.$Debug = this.$Container.parent().parent().find('#debug-' + this.oConfig.uid );
		};

		this.destroy = function () {};
		this.enable = function () {};
		this.disable = function () {};
	};

	var Scale = function( $Container, oOptions, $valuesContainer ) {

		/** templates **/
		var sScaleTemplate = '<div class="slider-scale"><div class="border"></div><div class="selection"></div></div>';

		var oConfig = {
		};
		/**
		 * ticks : array, ticks list : {
		 *    [ value : int, 0..100 ],
		 *    title : string, tick title,
		 *    realValue : float/int
		 * }
		 */
		this.oConfig = $.extend( oConfig, oOptions || {} );
		this.$Container = $Container;
		this.$Node = $( sScaleTemplate );
		this.$ValuesContainer = $valuesContainer || $('<div class="values"></div> ').appendTo( this.$Node );
		this.$Selection = this.$Node.find('.selection:first');

		this.aTicks = [];
	// regions cache
		this.aRegions = [];

		this.init = function() {
			this.createRegions();
			if ( this.oConfig.allowed ) {
				this.$Node.find('.selection').after( '<div class="allowed"></div><div class="allowed-inner"></div>' );
				this.oConfig.allowed[0] = this.getPosition( this.oConfig.allowed[0] );
				this.oConfig.allowed[1] = this.getPosition( this.oConfig.allowed[1] );
				this.$Node.find('.allowed').css({
					left : this.oConfig.allowed[0] + '%',
					width : (this.oConfig.allowed[1] - this.oConfig.allowed[0]) + '%'
				});
			}
		};
		this.createRegions = function () {
			var oPrevTick = null;
			for ( var i in this.oConfig.ticks ) if (  this.oConfig.ticks.hasOwnProperty(i) ) {
			// create tick
				this.aTicks.push( new ScaleTick( this.$Node, this.oConfig.ticks[i].value, this.oConfig.ticks[i].title, this.oConfig.ticks[i].realValue ) );
			// if have at least one tick, create region with it as a start
				if ( oPrevTick ) {
					var oRegion = new ScaleRegion( {
						min : oPrevTick.value,
						max : this.oConfig.ticks[i].value,
						minValue : oPrevTick.realValue,
						maxValue : this.oConfig.ticks[i].realValue
					} );

					if ( oRegion ) {
						this.aRegions.push( oRegion );
					}
				}
				oPrevTick = this.oConfig.ticks[i];
			}
		};
		this.getValue = function ( iPos ) {
			for ( var i = 0; i < this.aRegions.length; i++ ) {
				if ( this.aRegions[i].iMax < iPos ) {
					continue;
				}
				if ( this.aRegions[i].iMin <= iPos ) {
					return this.aRegions[i].getValue( iPos );
				}
			}
		};
		this.getPosition = function ( iValue ) {
			for ( var i = 0; i < this.aRegions.length; i++ ) {
				if ( this.aRegions[i].iMaxValue < iValue ) {
					continue;
				}
				if ( this.aRegions[i].iMinValue <= iValue ) {
					return this.aRegions[i].getPosition( iValue );
				}
			}
			return 50;
		};
		this.draw = function () {
			for (var i = 0; i < this.aTicks.length; i++ ) {
				this.aTicks[i].draw();
			}
			this.$Container.append( this.$Node );
		};
		this.updateSelection = function ( iMin, iMax ) {
			if ( this.$Selection.length ) {
				this.$Selection.css({
					left: iMin + '%',
					width: ( iMax - iMin ) + '%'
				});
			}
			if ( this.oConfig.allowed ) {
				var $a = this.$Node.find('.allowed-inner');
				// update before-after
				if (
					 this.oConfig.allowed[0] >= iMin && this.oConfig.allowed[0] <= iMax ||
					 this.oConfig.allowed[1] >= iMin && this.oConfig.allowed[1] <= iMax ||
					 this.oConfig.allowed[0] <= iMin && this.oConfig.allowed[1] >= iMax
					) {
				// draw allowed-before
					$a.show();
					$a.css({
						left : Math.max( iMin, this.oConfig.allowed[0] ) + '%',
						width: Math.min( iMax, this.oConfig.allowed[1] ) - Math.max( iMin, this.oConfig.allowed[0] ) + '%'
					});
				} else {
					$a.hide();
				}

			}

		};

		this.init();
	};

	var ScaleRegion = function ( oOptions ) {
		this.iMin = oOptions.min || 0;
		this.iMax = oOptions.max ||  0;
		this.iMinValue = oOptions.minValue || 0;
		this.iMaxValue = oOptions.maxValue || 0;

		if ( this.iMax - this.iMin < 0 || this.iMaxValue - this.iMinValue < 0 ) {
			return null;
		}

		this.getValue = function ( iPos ) {
			if ( iPos < this.iMin || iPos > this.iMax ) {
				return 0;
			}
			return this.iMinValue + ( ( iPos - this.iMin ) / ( this.iMax - this.iMin ) * ( this.iMaxValue - this.iMinValue ) );
		};
		this.getPosition = function ( iValue ) {
			if ( iValue < this.iMinValue || iValue > this.iMaxValue ) {
				return 0;
			}
			return this.iMin + ( ( iValue - this.iMinValue ) / ( this.iMaxValue - this.iMinValue ) ) * ( this.iMax - this.iMin );
		};
	};

	var ScaleTick = function( $Node, iPos, sTitle, iValue ) {

		this.$Container = $Node;

		/** templates **/
		var sTickTemplate = '<i class="scale-tick"><b><s></s></b></i>';

		this.init = function() {
			this.$Node = $(sTickTemplate);
			this.iPos = iPos;
			this.sTitle = sTitle;
			this.iValue = iValue;
			this.$Node.css('left', this.iPos + '%');
			var $c = this.$Node.find('s');
			$c.text( this.sTitle || this.iValue );
//			$c.css('marginLeft', '-' + $c.parent().width()/2 + 'px');
			if ( this.iPos == 0 ) {
				this.$Node.addClass('first-tick');
			} else if ( this.iPos == 100 ) {
				this.$Node.addClass('last-tick');
			}
		};

		this.draw = function () {
			this.$Container.append( this.$Node );
		};

		this.init();
	};

	var ScaleSlider = function ( $Container, oOptions, i ) {
		/** templates **/
		var sSliderTemplate = '<i class="slider"></i>';

		var oConfig = {
			min : 0,
			max : 100,
			value : 50,
			sEventPrefix 	: 'slider',
			$EventTarget 	: $Container
		};
		/**
		 * {
		 * 	min : mixed; ( int - value in percent, object - link to next slider to the left, null = 0 ),
		 * 	min : mixed; ( int - value in percent, object - link to next slider to the right, null = 100 ),
		 * 	value : int; current value in percent
		 * }
		 */
		this.oConfig = $.extend( oConfig, oOptions || {} );
		this.$Container = $Container;
		this.$Node = $( sSliderTemplate );
		this.$Node.addClass('slider_' + i);
		this.$Node.data( 'slider', this );

		this.draw = function () {
			this.$Container.append( this.$Node );
			this.$Node.css('left', this.oConfig.value + '%' );
		};
		this.onDrag = function (  ) {
		};
		this.getValue = function () {
			return this.oConfig.value;
		};
		this.setValue = function ( iVal ) {
			this.oConfig.value = iVal;
		};
		this.setValueObject = function ( oV ) {
			this.oValueObject = oV;
		}
	};

	var SliderValue = function ( $Container, oOptions, i ) {
		if ( !oOptions ) {
			oOptions = {};
		}
		var sTemplate = '<span class="value"></span>';
		var sDivider = '<s class="divide">&#133;</s>';
		this.oOptions = oOptions;
		this.$Container = $Container;
		this.$Node = $( sTemplate );
		this.sValue = '';

		this.draw = function () {
			if ( this.oOptions.value ) {
				this.setValue( this.oOptions.value );
			}
			this.$Container.append( this.$Node );
			if ( i > 0 ) {
				this.$Node.before( sDivider );
			}
		};
		this.setValue = function ( sValue ) {
			this.sValue = sValue;
			this.$Node.html( number_format( sValue, 0, ',', ' ' ) );
		};
		this.getValue = function () {
			return this.sValue;
		};
	};

	$.fn[sPluginName] = function( /** arguments: method, options | options **/) {
		// default settings
		var sMethod = 'init', oOptions = {};
		// have a single param or nothing at all
		if ( arguments.length < 2 ) {
			// if it's a single param and it's a string -> it's a method name
			if ( arguments.length && typeof arguments[0] == 'string' ) {
				sMethod = arguments[0];
				// else if it's a single param and an object -> it's init options
			} else {
				oOptions = arguments[0];
			}
			// if number of params is 2 or greater
		} else if ( typeof arguments[0] == 'string' ) {
			// first param is a method name
			sMethod = arguments[0];
			// if second param is an object, consider it as an options
			if ( typeof arguments[1] == 'object' ) {
				oOptions = arguments[1];
			}
		}
		// if method exists, run it with computed options
		if ( PluginMethods.hasOwnProperty( sMethod ) && typeof PluginMethods[ sMethod ] == 'function' ) {
			return this.each( function() {
				return PluginMethods[ sMethod ].apply( this, [ oOptions ] );
			});
		} else {
			return this;
		}
	}
})(jQuery);