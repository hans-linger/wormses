(function($){

	var oConfig = {
		multiple : false,
		items : [],
		url : ''
	};

	var SuggestMethods  = {

	/**
	 * initializing suggest widget
	 * @param oOptions
	 */
		init : function( oOptions ) {
			var oCurrentConfig = {};
		// if it's already inited, take current config
			if ( $(this).data('suggest') ) {
				oCurrentConfig = $(this).data('suggest').oOptions;
			}
		// overriding config params
			$.extend( oCurrentConfig, oConfig, oOptions || {} );
			if ( !$(this).data('suggest') ) {
				$(this).data('suggest', new Suggest( $(this), oCurrentConfig ) );
			}
			$(this).data('suggest').init( oOptions );

		},

		destroy : function() {
			if ( $(this).data('suggest') ) {
				$(this).data('suggest').destroy();
			}
		},

		enable : function() {
			if ( $(this).data('suggest') ) {
				$(this).data('suggest').enable();
			}
		},

		disable : function() {
			if ( $(this).data('suggest') ) {
				$(this).data('suggest').disable();
			}
		},

		setContent : function( oContent ) {
			if ( $(this).data('suggest') ) {
				$(this).data('suggest').setContent( oContent );
			}
		}

	};

	var SuggestSelector = function( $Node, aItems ) {

		var that = this;

		this.$Items = $('<ul class="jq-suggest-items"></ul>');
		this.aItems = aItems || [];
		this.$selected = $();
		this.$node = $();
		this.bIsShown = false;

		this.init = function () {

		};

		this.show = function( $node ) {
			if ( this.bIsShown ) {
				return;
			}
			this.bIsShown = true;
			this.$node = $node;
			this.$selected = this.$Items.find('li:first');
			$('body:first').append( this.$Items );
			this.$Items.css({
				left : $node.offset().left,
				top : $node.offset().top + $node.height()
			});
			this.$node.bind('keydown', that.handleKeyEvent);
			this.$Items.on('click', 'li', that.handleClick);
			this.$Items.on('mouseover', 'li', function () {
				that.$selected.removeClass('selected');
				that.$selected = $(this).addClass('selected');
			});
		};
		
		this.hide = function() {
			this.$Items.detach();
			this.$node.unbind('keydown',that.handleKeyEvent);
			this.$Items.off('click', 'li', that.handleClick);
			this.bIsShown = false;
		};

		this.handleClick = function (e) {
			that.onSelect();
		};

		this.handleKeyEvent = function( e ) {
			var iCode = e.keyCode;
			if ( iCode == 37 || iCode == 38 || iCode == 39 || iCode == 40 || iCode == 13 ) {
				e.preventDefault();
				that.$selected = that.$Items.find('.selected');
				switch ( iCode ) {
					case 13:
						that.onSelect();
					break;

					case 40:
					//down
						 that.goDown();
					break;

					case 38:
					// up
						that.goUp();
					break;
				}
			}
		};
		this.redraw = function( sVal, aGivenItems, aItems ) {
			if ( aItems ) {
				this.aItems = aItems;
			}
			this.$Items.find('li').remove();
			if ( sVal ) {
				var that = this;
				for (var i = 0, l = this.aItems.length, c = 0; i < l && c < 10; i++) {
					if ( this.aItems[i].indexOf(sVal) != -1 && aGivenItems.indexOf(this.aItems[i]) == -1 ) {
						that.$Items.append('<li>' + this.aItems[i].replace( sVal, '<b>' + sVal + '</b>' ) + '</li>');
						c++;
					}
				}
				that.$selected = this.$Items.find('li:first');
				that.$selected.addClass('selected');
			}
		};

		this.goDown = function() {
			if ( !this.$selected ) {
				this.$Items.find('li:first').addClass('selected');
			} else if ( this.$selected.next('li').length ) {
				this.$selected.removeClass('selected').next('li').addClass('selected');
			}
		};
		this.goUp = function() {
			if ( !this.$selected ) {
				this.$Items.find('li:last').addClass('selected');
			} else if ( this.$selected.prev('li').length ) {
				this.$selected.removeClass('selected').prev('li').addClass('selected');
			}
		};
		this.onSelect = function() {
			if ( this.$selected.length ) {
				this.$node.trigger( 'value:selected', this.$selected.text() );
			} else {
				this.$node.trigger( 'value:new' );
			}
		};

	};
	
	var Suggest = function( $Node, oOptions ) {

		this.$Container = $Node;
		this.oSelector = null;
		this.a$InputElements = [];
		this.aValue = [];
		this.aItems = [];
		this.cInputValue = '';
		this.$cInput = $();
		this.oBlurTimeout = null;

		this.init = function() {
			this.$cInput = this.$Container.find('input:first');
			this.$cInput.wrap('<div class="jq-suggest-container"/>');
			this.oSelector = new SuggestSelector( this.$Container, oOptions.items || [] );
			this.a$InputElements.push( this.$Container.find('input:first') );
			var that = this;
			this.$Container.on('focus', 'input', function(){
			});
			this.$Container.on('blur', 'input', function(e){
				that.oBlurTimeout = window.setTimeout(function () { that.oSelector.hide();}, 100);
//				that.oSelector.hide();
			});
			this.$Container.on('change keyup click', 'input', function( e ) {
				e.stopPropagation();
				if ( this.value != that.cInputValue ) {
				// trigger change
					if ( oOptions.url && !that.aItems[ this.value ] ) {
						$.ajax({
							type : 'get',
							url : oOptions.url,
							data : {
								startWith : this.value
							},
							context : this,
							cache : true,
							success : function (d) {
								if ( d && d.hasOwnProperty('tags') ) {
									that.aItems[ this.value ] = d.tags;
									that.redrawSelector( this.value, d.tags );
								}
							}
						});
					} else if ( oOptions.url && that.aItems[ this.value ] ) {
						that.redrawSelector( this.value, that.aItems[ this.value ]);
					} else if ( oOptions.items.length ) {
						that.redrawSelector( this.value );
					}
				}
			});
			this.$Container.on('value:selected', 'input', function (e, val) {
				if ( that.aValue.indexOf( val ) == -1 ) {
					that.createNode( val );
					that.$cInput.val( '' );
					that.oSelector.hide();
					that.aValue.push(val);
					that.onChange();
				}
			});
			this.$Container.on('value:new', 'input', function (e) {
				var val = this.value;
				if ( that.aValue.indexOf( val ) == -1 ) {
					that.createNode( val );
					that.$cInput.val( '' );
					that.oSelector.hide();
					that.aValue.push(val);
					that.onChange();
				}
			});
			this.$Container.on('click', '.node>b', function (e) {
				var $parent = $(this).parent();
				var i = that.aValue.indexOf( $parent.text() );
				if ( i != -1 ) {
					that.aValue.splice(i);
					that.onChange();
				}
				$parent.remove();
			});
		};

		this.onChange = function () {
			this.$cInput.trigger('value:change', [this.aValue]);
		};

		this.createNode = function( sVal ) {
			var $El = $('<i class="node">' + sVal + '<b></b></i>');
			this.$cInput.before($El);
			this.a$InputElements.push($El);
			this.cInputValue = '';
		};

		this.redrawSelector = function( sVal, aItems ) {
//			console.log(sVal.toLowerCase(), this.$items.find('li').hide().filter('[value^=пол]').length);
			sVal = sVal.toLowerCase().replace('<', '&lt;');
			if ( sVal ) {
				this.oSelector.show( this.$cInput );
				this.oSelector.redraw( sVal, this.aValue, aItems || [] );
			} else {
				this.oSelector.hide();
			}
			this.cInputValue = sVal;
		};

	};

	$.fn.suggest = function( /** arguments: method, options | options **/) {
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
		if ( SuggestMethods.hasOwnProperty( sMethod ) && typeof SuggestMethods[ sMethod ] == 'function' ) {
			return this.each( function() {
				return SuggestMethods[ sMethod ].apply( this, [ oOptions ] );
			});
		} else {
			return this;
		}
	}
})(jQuery);