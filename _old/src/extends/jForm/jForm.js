var template = require('raw!./jForm.html');
require('style!raw!./jForm.css');
require('../jQuery/plugin.suggest');
require('../jQuery/plugin.slider');
require('../jQuery/plugin.wysiwyg');
/**********************************
 * Helper methods
 **********************************/
var _jFormHelpers = {
/**
 * creates a function for beautifying numbers
 * @param bFloat - can be float
 * @param bNegative - can be negative
 */
	fClearNumber : function ( bFloat, bNegative ) {
		// cleaning
		var sR = '[^0-9', sTo = '', sJoin = ',';
		if ( bFloat ) { sR += '.'; }
		if ( bNegative ) { sR += '\-'; }
		sR += ']';
		var rCleanReg = new RegExp( sR, 'g');

		return function ( fValue ) {
			var oRes = { sText : fValue, iVal : fValue };
			if ( bNegative && fValue == '-' ) {
				return oRes;
			}
			fValue = fValue.replace(',', '.');
			if ( bFloat && fValue.match(/^-?\d+\.$/) ) {
				oRes.sText = fValue.toString().replace('.', ',');
				return oRes;
			}
			fValue = fValue.replace( rCleanReg, '' );

			if ( bFloat ) {
				fValue = parseFloat( fValue );
			} else {
				fValue = parseInt( fValue );
			}
			if ( isNaN( fValue ) ) {
				oRes.sText = '';
				oRes.iVal = 0;
			} else {
				oRes.sText = fValue.toString().replace('.', ',');
				oRes.iVal = fValue;
			}
			return oRes;
		};
		/** TODO do further cleaning if necessary */
		sR = '([0-9]*)([^0-9]?.*)';
		if ( bFloat ) {
			sR = '([0-9]*)(,|\.)?' + sR;
		}
		if ( bNegative ) {
			sR = '(-)?' + sR;
		}
		var rReg = new RegExp( sR, 'g' );
		if ( bFloat ) {
			if ( bNegative ) {
				sTo = '$1$2' + sJoin + '$4';
			} else {
				sTo = '$1' + sJoin + '$3';
			}
		} else {
			if ( bNegative ) {
				sTo = '$1$2';
			} else {
				sTo = '$1';
			}
		}
		fValue = fValue.replace( rReg, sTo );

		var oRes = { sText : '', iVal : 0 };
		if ( parseFloat(fValue.replace(/,/,'.')) > 0 ) {
			oRes.sText = fValue;
			oRes.iVal = parseFloat(fValue.toString().replace(/,/,'.').replace(/^0*/,''));
		} else {
			oRes.sText = '0';
			oRes.iVal = 0;
		}
		return oRes;
	}
};

/**********************************
* Common "parent" widget
* @param oData misc data for each type;
* общие свойства :
* {
* 	required : boolean, обязательно ли к заполнению,
* 	value : mixed, заданное значение,
* 	name : string, имя поля
* }
* @param sLocalePath
**********************************/
function jFormInput ( oData, oForm, sLocalePath ) {
	var _widget = {
		value : null,
		oData : oData,
		oForm : oForm,
		uid : _.uniqueId('jf-input-'),
		sLocalePath : sLocalePath,
		$el : $(),
		init : function () {
		},
		bindEvents : function () {
			var that = this;
			if ( this.oForm.hasOwnProperty('type') && this.oForm.type == 'filters' ) {
				this.$el.find('.title').on('click', function () {
					that.toggle();
				});
			}
		},
		$render : function () { return $(); },
		getTitle : function () {
			return window.LocaleManager.get(this.sLocalePath + '.' + this.oData.name + '.title');
		},
		getFormValue : function () {
			return { name : this.oData.name, value : this.getValue() };
		},
		getValue : function () {
			return this.oData.valueFilter && typeof this.oData.valueFilter == 'function' ? this.oData.valueFilter.apply( this, [ this.value ] ) : this.value;
		},
		setValue : function ( val, bSilent ) {
			this.value = val;
			if ( !bSilent ) {
				this.$el.trigger('value:change', [ this.uid, this.value ]);
			}
		},
		hasValue : function () {
			return !!this.getValue();
		},
		isValid : function () {
			var b = (!this.oData['required'] || this.hasValue() );
			this.$el[ ( b ? 'remove' : 'add' ) + 'Class' ]( 'error' );
			return b;
		},
		setAutoFocus : function () {
			this.$el.find('input:first').focus();
		},
		toggle : function () {
			if ( this.$el.hasClass('active') ) {
				this.hide();
				this.$el.removeClass('active');
			} else {
				this.show();
				this.$el.addClass('active');
			}
		},
		show : function () {
			this.$el.find('dd:first').show();
		},
		hide : function () {
			this.$el.find('dd:first').hide();
		},
		toString : function () {
			return this.getValue().toString();
		}
	};
	return _widget;
}

/**********************************
* Simple text input
* oData : {
* 	autocomplete : boolean, включать ли стандартное браузерное автодополнение
* }
**********************************/
function jFormInputText ( oData, oForm, sLocalePath ) {
	var _widget = jFormInput( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $(template).find('#text').html() );
	_widget.$render = function () {
		return this.$el = $( oTemplate( {
			name : this.oData.name,
			uid : this.uid,
			title : this.getTitle(),
			value : this.oData.value,
			autocomplete : this.oData.hasOwnProperty('autocomplete') ? !!this.oData.autocomplete : true,
			placeholder : this.oData.hasOwnProperty('placeholder') ? window.LocaleManager.get( this.sLocalePath + '.' + this.oData.name + '.placeholder' ) : null
		} ) );
	};
	_widget.value = _widget.oData['value'] || '';
	_widget.init = function () {
		this.$el.on('keyup keypress click change', 'input:first', function () {
			if ( this.value != _widget.value ) {
				_widget.value = this.value;
				$(this).trigger('value:change', [ _widget.uid, this.value ]);
			}
		});
	};
	return _widget;
}

/**********************************
* Simple text input
* oData : {
* }
**********************************/
function jFormInputPassword ( oData, oForm, sLocalePath ) {
	var _widget = jFormInputText( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $(template).find('#password').html() );
	_widget.$render = function () {
		this.$el = $( oTemplate( {
			name : this.oData.name,
			uid : this.uid,
			title : this.getTitle(),
			value : this.oData.value,
			placeholder : this.oData.hasOwnProperty('placeholder') ? window.LocaleManager.get( this.sLocalePath + '.' + this.oData.name + '.placeholder' ) : null,
			switchable : !!this.oData.switchable
		} ) );
		this.$el.on('click', '.switch', function () {
			_widget.$el.find('input').attr('type', _widget.$el.find('input').attr('type') == 'password' ? 'text' : 'password' );
			$(this).toggleClass('switched');
		});
		return this.$el;
	};
	_widget.value = _widget.oData['value'] || '';
	return _widget;
}

/**********************************
* Textarea input
* oData : {
* 	wysiwyg : mixed, переключатель между обычной textarea и виджетом wysiwyg; если задан, то объект с параметрами для плагина jquery.wysiwyg,
* }
**********************************/
function jFormInputTextarea ( oData, oForm, sLocalePath ) {
	var _widget = jFormInput( oData, oForm, sLocalePath );

	var oTemplate = _.exTemplate( $(template).find('#textarea' + ( oData.wysiwyg ? '-wysiwyg' : '')).html() );
	_widget.$render = function () {
		this.$el = $( oTemplate( { name : this.oData.name, uid : this.uid, title : this.getTitle(), value : this.getValue().text } ) );
		if ( oData.wysiwyg ) {
			this.$el.find('.jf-wysiwyg').wysiwyg( _.extend({ bNoSubmit : true }, oData.wysiwyg ));
		}
		return this.$el;
	};
	_widget.aUrls = [];
	_widget.setValue = function ( value, bSilent ) {
		if ( !value ) {
			this.value = { images : [], text : '' };
		} else if ( typeof value == 'string' ) {
			this.value = { images : [], text : value };
		} else if ( typeof value == 'object' ) {
			this.value = value;
		}
		if ( !bSilent ) {
			this.$el.trigger('value:change', [ this.uid, this.value ]);
		}
		if ( _widget.$el && _widget.$el.length ) {
			if ( oData.hasOwnProperty('wysiwyg') ) {
				_widget.$el.find('.jf-wysiwyg').data('wysiwyg').setContent( this.value.text );
			} else {
				_widget.$el.find('textarea').val( this.value.text );
			}
		}
	};
	_widget.setValue( _widget.oData['value'], true );
	_widget.init = function () {

		if ( oData.wysiwyg ) {
			this.$el.on('keyup keypress click change paste', '.wysiwyg-content:first', function (e) {
				if ( this.innerHTML != _widget.value ) {
					var d = _widget.$el.find('.jf-wysiwyg').data('wysiwyg').getValue();
					$(this).trigger('value:change', [ _widget.uid, d ]);
				}
			});
		} else {
			// simple textarea
			this.$el.on('keyup keypress click change paste', 'textarea:first', function (e) {
				if ( e.ctrlKey && ( ( e.charCode || e.keyCode ) == 13 ) ) {
					$(this).trigger('textarea.submit');
				}
				if ( this.value != _widget.value.text ) {
					_widget.value.text = this.value;
					$(this).trigger('value:change', [ _widget.uid, _widget.value ]);
				}
			});
		}
	};
	_widget.setAutoFocus = function () {
		if ( oData.wysiwyg ) {
			this.$el.find('.wysiwyg-content:first').focus();
		} else {
			this.$el.find('textarea:first').focus();
		}
	};
	if ( oData.hasOwnProperty('wysiwyg') ) {
		_widget.enable = function () {
			_widget.$el.find('.jf-wysiwyg').data('wysiwyg').enable();
		};
		_widget.disable = function () {
			_widget.$el.find('.jf-wysiwyg').data('wysiwyg').disable();
		};
	}

	_widget.hasValue = function () {
		return !!this.getValue().text.length;
	};
	_widget.toString = function () {
		return this.getValue().text.toString();
	};
	return _widget;
}

/**********************************
* Number input
* oData : {
* 	min : number, минимальное значение
* 	max : number, максимальное значение,
* 	autocomplete : boolean, включать ли стандартное браузерное автодополнение,
* 	float : boolean, может ли число быть дробным,
* 	negative : boolean, может ли число быть отрицательным
* }
**********************************/
function jFormInputNumber ( oData, oForm, sLocalePath ) {
	var _widget = jFormInput( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $(template).find('#number').html() );
	var clearNum = _jFormHelpers.fClearNumber( _widget.oData.float, _widget.oData.negative );
	_widget.value = _widget.oData['value'] || '';
	_widget.$render = function () {
		this.$el = $( oTemplate( {
			name : this.oData.name,
			uid : this.uid,
			title : this.getTitle(),
			value : this.oData.value,
			min : this.oData.min || null,
			max : this.oData.max || null,
			autocomplete : this.oData.hasOwnProperty('autocomplete') ? !!this.oData.autocomplete : true
		} ) );
		return this.$el;
	};
	_widget.init = function () {
		this.$el.find('input:first').on('keyup keypress click change', function () {
			if ( this.value != _widget.value ) {
				var clean = clearNum( $(this).val() );
//					if ( _widget.oData.min && clean.iVal < _widget.oData.min ) {
//						clean = clearNum( _widget.oData.min.toString() );
//					} else if ( _widget.oData.max && clean.iVal > _widget.oData.max ) {
//						clean = clearNum( _widget.oData.max.toString() );
//					}
				if ( this.value != clean.sText ) {
					this.value = clean.sText;
				}
				if ( clean.iVal != _widget.value ) {
					_widget.value = clean.iVal;
					$(this).trigger('value:change', [ _widget.uid, clean.iVal ]);
				}
			}
		});
	};
	_widget.hasValue = function () {
		return !!this.getValue();
	};
	return _widget;
}

/**********************************
* checkbox
* @param oData
* @param sLocalePath
**********************************/
function jFormCheckbox( oData, oForm, sLocalePath ) {
	var _widget = jFormInput( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $(template).find('#checkbox').html() );
	_widget.value = !!oData.value;
	_widget.$render = function () {
		this.$el = $( oTemplate( {
			name : oData.name,
			title : this.getTitle(),
			checked : this.value,
			uid : this.uid
		} ) );
		this.$el.on('change', 'input', function () {
			_widget.value = !!$(this).prop( 'checked' );
			_widget.$el.trigger( 'value:change', [ _widget.uid, _widget.value ] );
		});
		return this.$el;
	};
	return _widget;
}
/**********************************
* checkbox group
* @param oData
* @param sLocalePath
**********************************/
function jFormCheckboxGroup ( oData, oForm, sLocalePath ) {
	var _widget = jFormInput( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $(template).find('#checkbox-group').html() );
	_widget.value = oData.values ? ( typeof oData.values == 'string' ? oData.values.split(',') : oData.values ) : null;
	_widget.refreshValue = function () {
		var $v = _widget.$el.find(':checked').filter(':not(:disabled)');
		_widget.value = [];
		for (var i = 0; i < $v.length; i++) {
			_widget.value.push( $($v[i]).closest('.option').data('value') );
		}
		_widget.$el.trigger( 'value:change', [ _widget.uid, _widget.value ] );
	};
	_widget.toString = function ( sJoin ) {
		return this.value.join( sJoin || ', ');
	};
	_widget.$render = function () {
		var oOptions = _.map( this.oData.options, _.bind( function ( val ) {
			return window.LocaleManager.get( sLocalePath + '.' + this.oData.name + '.options.' + val ) || val;
		}, this) );
		var oFilters = null;
		if ( this.oData.hasOwnProperty('filters') ) {
			var c = null, cActive;
			oFilters = {};
			_.each( this.oData.filters, _.bind( function ( x, i ) {
				c = { options : x };
				if ( !this.oData.activeFilter && !cActive || this.oData.activeFilter == i ) {
					c.active = true;
					cActive = true;
				}
				c.title = window.LocaleManager.get( sLocalePath + '.' + this.oData.name + '.filters.' + i ) || i;
				oFilters[i] = c;
			}, this) );
		}
		this.$el = $( oTemplate( {
			name : this.oData.name,
			uid : this.uid,
			title : this.getTitle(),
			values : _.map( _widget.value, function (x) { /** TODO profile */ return !isNaN( parseInt(x) ) ? parseInt(x) : x; }),
			options : oOptions,
			checkboxValues : this.oData.options,
			filters : oFilters
		} ) );
		if ( oFilters ) {
			this.$el.on('click', '.filter', function () {
				if ( $(this).hasClass('active') ) {
					return false;
				}
				_widget.$el.find('.filters .active').removeClass('active');
				$(this).addClass('active');
				var $o = _widget.$el.find('.option');
				$o.removeClass('disabled');
				_.each( $o, _.bind( function (x) {
					if ( _.indexOf( oFilters[$(this).data('type')].options, $( x ).data('value') ) != -1 ) {
						$( x ).addClass('disabled');
					}
				}, this ) );
				_widget.refreshValue();
			});
		}
		this.$el.on('click', '.option', function (e) {
			if ( $(this).hasClass('disabled') ) {
				return;
			}
			_widget.refreshValue();
		});
		return this.$el;
	};
	return _widget;
}

/**********************************
* pseudo-checkboxes group
* @param oData
* @param sLocalePath
**********************************/
function jFormChoiceGroup ( oData, oForm, sLocalePath ) {
	var _widget = jFormInput( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $(template).find('#choice-group').html() );

	if ( oData.single ) {
		_widget.value = '';
		if ( oData.values ) {
			_widget.value = typeof oData.values == 'string' ? oData.values.split(',')[0] : oData.values[0];
		} else if ( oData.value ) {
			_widget.value = oData.value;
		}
	} else {
		_widget.value = [];
		if ( oData.value ) {
			_widget.value = [ oData.value ];
		} else if ( oData.values ) {
			_widget.value = typeof oData.values == 'string' ? oData.values.split(',') : oData.values;
		}
	}

	_widget.checkSiblings = function ( $t, bSwitch ) {
		var $prev = $t.prev('.single'), $next = $t.next('.single');
	// if next is checked: .next-checked
	// if prev is checked: .prev-checked
		if ( oData.single ) {
			$t.parent().find('.single').removeClass( ( bSwitch ? 'checked ' : '' ) + 'next-checked prev-checked');
			if ( bSwitch ) {
				$t.addClass('checked');
			}
		} else {
			if ( bSwitch ) {
				$t.toggleClass('checked');
			}
		}

		if ( $t.hasClass('checked') ) {
			if ( $prev.length ) {
				$prev.addClass('next-checked');
			}
			if ( $next.length ) {
				$next.addClass('prev-checked');
			}
		} else {
			if ( $prev.length ) {
				$prev.removeClass('next-checked');
			}
			if ( $next.length ) {
				$next.removeClass('prev-checked');
			}
		}

	};
	_widget.$render = function () {
	// translate options
		var oOptions = _.map( this.oData.options, _.bind( function ( val ) {
			return window.LocaleManager.get( sLocalePath + '.' + this.oData.name + '.options.' + val.toString() ) || val;
		}, this) );
	// prepare values
		var aValues = typeof _widget.value == 'string' ? [ _widget.value ] : _widget.value;

		this.$el = $( oTemplate( {
			name : this.oData.name,
			uid : this.uid,
			title : this.getTitle(),
			values : _.map( aValues, function (x) { /** TODO profile */ return !isNaN( parseInt(x) ) ? parseInt(x) : x; }),
			options : oOptions,
			choiceValues : this.oData.options
		} ) );
		var $toCheck = this.$el.find( !oData.single ? '.single' : '.checked' );
		$toCheck.each( function () { _widget.checkSiblings( $(this) ) } );
		this.$el.on('click keydown', '.single', function () {
			_widget.checkSiblings( $(this), true );
			var $v = _widget.$el.find('.checked');
			if ( oData.single ) {
				_widget.value = $( $v[0] ).data('value');
			} else {
				_widget.value = [];
				for ( var i = 0; i < $v.length; i++ ) {
					_widget.value.push( $( $v[i] ).data('value') );
				}
			}
			$(this).trigger( 'value:change', [ _widget.uid, _widget.value ] );
		});
		return this.$el;
	};
	_widget.toString = function ( sJoin ) {
		return typeof this.getValue() == 'string' ? this.getValue() : this.getValue().join( sJoin || ', ');
	};
	return _widget;
}

/**********************************
* Fieldset
* has recursive child widget initialization
**********************************/
function jFormFieldset ( oData, oForm, sLocalePath ) {
	var _widget = jFormInput( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $(template).find('#fieldset').html() );
	_widget.aWidgets = {};
	_widget.$render = function () {
		// prepare widgets
		this.aWidgets = _jForm.parseFields.call( oForm, this.oData.fields, this.sLocalePath + '.' + this.oData.name + '.fields' );
		_.each(this.aWidgets, function (x) {
			oForm.aWidgetLinks[x.uid] = x;
		});
		var $FS = $( oTemplate( { name : this.oData.name, uid : this.uid, title : this.getTitle() } ) );
		_.each(this.aWidgets, _.bind( function ( cWidget ) {
			$FS.append( cWidget.$render() );
			cWidget.init();
		}, this) );
		return $FS;
	};
	_widget.getValue = function () {
		return _.map( this.aWidgets, function (x) { return x.getValue(); } );
	};
	_widget.getFormValue = function () {
		return _.map( this.aWidgets, function (x) { return x.getFormValue(); } );
	};
	_widget.hasValue = function () {
		/** TODO think **/
		return true;
	};
	_widget.isValid = function () {
		return !_.find( this.aWidgets, function (x) { return !x.isValid(); });
	};
	_widget.toString = function () {
		return _.map( this.aWidgets, function (x) { return x.toString(); } );
	};
	return _widget;
}

/**********************************
* Radiobuttons
*	oData : {
* 	options : [ o1, o2, ... ] - выбор. подписи берутся из локали.
* }
**********************************/
function jFormInputRadio( oData, oForm, sLocalePath ) {
	var _widget = jFormInput( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $(template).find('#radio').html() );
	_widget.value = oData.value || null;
	_widget.$render = function () {
		var oOptions = _.map( this.oData.options, _.bind( function ( val ) {
			return window.LocaleManager.get( sLocalePath + '.' + this.oData.name + '.options.' + val ) || val;
		}, this) );
		this.$el = $( oTemplate( {
			name : this.oData.name,
			uid : this.uid,
			title : this.getTitle(),
			value : this.value,
			options : oOptions,
			radioValues : this.oData.options
		} ) );
		this.$el.on('click', '.option', function () {
			var $t = $(this);
			$t.siblings('.checked').removeClass('checked');
			$t.addClass('checked');
			if ( _widget.value != $t.data('value') ) {
				_widget.value = $t.data('value');
				$(this).trigger( 'value:change', [ _widget.uid, _widget.value ] );
			}
		});
		return this.$el;
	};
	return _widget;
}

/**********************************
* Suggest
* oData : {
*		items, url : параметры плагина jquery.suggest
* }
**********************************/
function jFormInputSuggest( oData, oForm, sLocalePath ) {
	var _widget = jFormInput( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $(template).find('#suggest').html() );

	_widget.$render = function () {
		this.$el = $( oTemplate( { name : this.oData.name, uid : this.uid, title : this.getTitle(), value : this.oData.value, options: _widget.oData.options, placeholder: this.oData.hasOwnProperty('placeholder') ? window.LocaleManager.get( this.sLocalePath + '.' + this.oData.name + '.placeholder' ) : null } ) );
		$('body').one('appended', function (e) {
			_widget.$el.find('.jf-input-container select').chosen( {
				multiple : !!_widget.oData.multiple,
				url : _widget.oData.url,
				no_results_text: window.LocaleManager.get('common.form.suggest.noResults')
			} ).change(function (e, d) { _widget.value = d.selected; });
		});
		return this.$el;
	};

	_widget.value = _widget.oData.value ? ( typeof _widget.oData.value == 'string' ? _widget.oData.value.split(',') : _widget.oData.value ) : [];

	_widget.init = function () {
		this.$el.on('value:change', 'input', function ( e, aValue ) {
			e.stopPropagation();
			if ( aValue != _widget.value ) {
				_widget.value = aValue;
				_widget.$el.trigger('value:change', [ _widget.uid, aValue ]);
			}
		});
	};
	_widget.toString = function ( sJoin ) {
		return this.getValue().join( sJoin || ', ' );
	};
	return _widget;
}
/**********************************
* Select
* oData : {
*		options: варианты
* }
**********************************/
function jFormInputSelect( oData, oForm, sLocalePath ) {
	var _widget = jFormInput( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $(template).find('#select').html() );
	var oWidgetTemplate = _.exTemplate( $(template).find('#select-widget').html() );
	_widget.value = oData.value || null;
	_widget.prepareOptions = function () {
		this.oOptions = _.map( this.oData.options, _.bind( function ( val ) {
			if ( _.isObject(val) ) {
				if ( val.hasOwnProperty('title') ) {
					return [ val['id'], val['title'] ]
				} else {
					return [ val['id'], window.LocaleManager.get( sLocalePath + '.' + this.oData.name + '.options.' + val['name'] ) || val['name'] ];
				}
			} else {
				return [ val, window.LocaleManager.get( sLocalePath + '.' + this.oData.name + '.options.' + val ) || val ];
			}
		}, this) );
	};
	_widget.createElement = function () {
		var oData = {
			name : this.oData.name,
			uid : this.uid,
			title : this.getTitle(),
			value : this.value,
			options : this.oOptions,
			selectValues : this.oData.options
		};
		this.$el = $( oTemplate( oData ) );
		this.$el.find('dd:first').append( $( oWidgetTemplate( oData ) ) );

	};
	_widget.afterInit = function () {
		var $select = this.$el.find('select:first');
		_.each( this.oOptions, _.bind( function ( x, i ) {
			$select.append('<option value="' + x[0] + '" ' + ( x[0] == this.value || ( !this.value && !i ) ? ' selected="selected"' : '' ) + '>' + x[1] + '</option>');
			if ( x[0] == this.value || !this.value && !i ) {
				this.setLabel( x[1] );
				_widget.setValue( x[0], true );
			}
		}, _widget ) );
		this.$el.on('focus', 'select', function () {
			$(this).closest('.jf-select-container').addClass('focused');
		});
		this.$el.on('blur', 'select', function () {
			$(this).closest('.jf-select-container').removeClass('focused');
		});
		this.$el.on('change keyup', 'select', function () {
			var $t = $(this);
			if ( _widget.value != $t.val() ) {
				_widget.value = $t.val();
				_widget.setLabel( $t.find('option:selected').text() );
				$(this).trigger( 'value:change', [ _widget.uid, _widget.value ] );
			}
		});
	};
	_widget.setLabel = function ( sLabel ) {
		if ( oData.titlePattern ) {
			if ( typeof oData.titlePattern == 'function' ) {
				this.$el.find('.w-select .value').text(  oData.titlePattern.apply( this, [ _widget.value, sLabel ] ) );
			}
		} else {
			this.$el.find('.w-select .value').text( sLabel );
		}
	};

	_widget.$render = function () {
		this.prepareOptions();
		this.createElement();
		this.afterInit();
		this.$el.data('widget', _widget);
		return this.$el;
	};

	return _widget;
}
/**********************************
* Select
* oData : {
*		options: варианты
* }
**********************************/
function jFormInputMultilevelSelect( oData, oForm, sLocalePath ) {
	var _widget = jFormInputSelect( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $(template).find('#multilevelSelect').html() );
	_widget.value = oData.value || null;
	_widget.sSelectTemplate = _.exTemplate( $(template).find('#multilevelselect-widget').html() );
	_widget.aOptionLinks = {};
	_widget.prepareOptions = function () {
		var cValue = null;
		var fMap = function ( aData, iLevel, oParent ) {
			var cRes;
			return _.map( aData, _.bind( function ( val ) {
				cRes = { id : val.id, parent : oParent ? oParent.id : null };
				if ( val.hasOwnProperty('title') ) {
					cRes.title = val.title;
				} else {
					cRes.title = window.LocaleManager.get( sLocalePath + '.' + this.oData.name + '.options.' + val.name ) || val.name;
				}
				if ( val.hasOwnProperty('children') && _.isArray( val.children ) ) {
					cRes.children = fMap( val.children, iLevel|0 + 1, cRes );
				}
				this.aOptionLinks[ 'id' + val.id ] = cRes;
				return cRes;
			}, this) );
		}.bind(this);
		this.oOptions = fMap( this.oData.options );
	};
	_widget.createElement = function () {
		this.$el = $( oTemplate( {
			name : this.oData.name,
			uid : this.uid,
			title : this.getTitle(),
			value : this.value,
			options : this.getOptionsInfo(),
			selectValues : this.oData.options
		} ) );
	};
	_widget.changeValue = function ( val ) {
		if ( _widget.value != val ) {
			_widget.value = val;
			_widget.$el.trigger( 'value:change', [ _widget.uid, _widget.value ] );
			_widget.$el.find('input[type=hidden]').val( _widget.value );
		}
	};
	_widget.afterInit = function () {
		if ( this.aOptionLinks.hasOwnProperty('id' + _widget.value ) ) {

			if ( !this.aOptionLinks[ 'id' + _widget.value ].parent ) {
				this.$el.find('dd').append( this.$createSelect( this.oOptions, 0, _widget.value ) );
			} else {
				var aChain = [];
				var fBuildChain = function ( sId ) {
					aChain.unshift( sId );
					var oObj = this.aOptionLinks[ 'id' + sId ];
					if ( oObj.parent ) {
						fBuildChain.apply( this, [ oObj.parent ] );
					}
				};
				fBuildChain.apply( this, [ _widget.value ] );

				for ( var i = 0; i < aChain.length; i++ ) {
					if ( this.aOptionLinks[ 'id' + aChain[i] ].children ) {
						this.$el.find('dd').append( this.$createSelect( this.aOptionLinks[ 'id' + aChain[i] ].children, i, i < aChain.length-1 ? aChain[i+1] : '' ) );
					}
				}
			}


		} else {
			this.$el.find('dd').append( this.$createSelect( this.oOptions ) );
		}

		this.$el.on('focus', 'select', function () {
			$(this).closest('.jf-select-container').addClass('focused');
		});
		this.$el.on('blur', 'select', function () {
			$(this).closest('.jf-select-container').removeClass('focused');
		});
		this.$el.on('change keyup', 'select', function () {
			var $t = $(this);
			var $s = $t.closest('.jf-select-wrapper');
			var iLevel = $s.find('select').data('level');
			_widget.changeValue( $t.val() );
			_widget.onChange( $s, $t.val(), iLevel );
			_widget.refreshTitles();
		});
		this.refreshTitles();
	};
	_widget.onChange = function ( $s, val, iLevel ) {
		$s.nextAll().remove();
		if ( val ) {
			var oNext = _widget.getOptionsInfo( val );
			if ( oNext && oNext.length ) {
				var $cs = _widget.$createSelect( oNext, iLevel + 1 );
				$s.after( $cs );
				if ( !_widget.oData.emptyName ) {
					var oNN = _widget.getOptionsInfo( $cs.find('option:first').val() );
					if ( oNN ) {
						_widget.onChange( $cs, $cs.find('option:first').val(), iLevel + 1 );
					}
				}
			}
		} else {
			_widget.changeValue( $s.prev('select').val() );
		}
	};
	_widget.$createSelect = function ( aData, iLevel, sValue ) {
		var $el = $( this.sSelectTemplate( { level : iLevel|0 } ) );
		var $wel = $el.find('select:first');
		aData = _.sortBy( aData, 'order' );
		if ( _widget.oData.emptyName ) {
			var sTitle = window.LocaleManager.get(this.sLocalePath + '.' + this.oData.name + '.emptyName');
			$wel.append( '<option value=""' + ( sValue ? '' : ' selected="selected"' ) + '>' + sTitle + '</option>' );
			if ( !sValue && !( iLevel|0 ) ) {
				_widget.changeValue('');
			}
		}
		_.each( aData, function (x, i) {
			if ( !sValue && ( !_widget.oData.emptyName && i == 0 ) ) {
				_widget.value = x.id;
			}
			$wel.append( '<option value="' + x.id + '" ' + ( ( ( !_widget.oData.emptyName && i == 0 ) || sValue == x.id ) ? ' selected="selected"' : '' ) + '>' + x.title + '</option>' );
		} );
		return $el;
	};
	_widget.getOptionsInfo = function ( sId ) {
		if ( !sId ) {
			return this.oOptions;
		} else if ( this.aOptionLinks.hasOwnProperty( 'id' + sId )  ) {
			return this.aOptionLinks[ 'id' + sId ].children;
		} else {
			return false;
		}
	};
	_widget.refreshTitles = function () {
		this.$el.find('.jf-select-container').each(function (){
			$(this).find('.w-select .value').text( $(this).find('select option:selected').text() );
		});
	};
	return _widget;
}
/**********************************
* Slider
* oData : {
*
* }
**********************************/
function jFormInputSlider( oData, oForm, sLocalePath ) {
	var _widget = jFormInput( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $(template).find('#slider').html() );
	var prepareTicks = function ( aTicks ) {
		_.each( aTicks, _.bind( function ( x ) {
			x.title = window.LocaleManager.get( this.sLocalePath + '.' + this.oData.name + '.' + 'ticks' + '.' + x.value) || _.number_format( x.realValue, 0, ',', ' ');
		}, this) );
		return aTicks;
	};

	_widget.$render = function () {
		this.$el = $( oTemplate( { name : this.oData.name, uid : this.uid, title : this.getTitle(), value : this.oData.value } ) );
		this.$el.find('dd:first').slider( { ticks : prepareTicks.call( _widget, this.oData.ticks), url : this.oData.url, uid : this.uid, sliders : this.oData.sliders, allowed : this.oData.allowed, $Values : this.$el.find('dt .values') } );
		return this.$el;
	};

	_widget.value = _widget.oData.value ? ( typeof _widget.oData.value == 'string' ? _widget.oData.value.split(',') : _widget.oData.value ) : [];

	_widget.init = function () {
		this.$el.on('value:change', '.jq-slider', function ( e, aValue ) {
			e.stopPropagation();
			e.preventDefault();
			if ( aValue.join(';') != _widget.value ) {
				_widget.value = aValue.join(';');
				_widget.$el.trigger('value:change', [ _widget.uid, _widget.value ]);
			}
		});
	};
	_widget.toString = function ( sJoin ) {
		return this.getValue().join( sJoin || '—' );
	};
	return _widget;
}
/**********************************
* Hidden input
**********************************/
function jFormInputHidden ( oData, oForm ) {
	var _widget = jFormInput( oData, oForm );
	var oTemplate = _.exTemplate( $(template).find('#hidden').html() );
	_widget.$render = function () {
		this.$el = $( oTemplate( { name : this.oData.name, value : this.oData.value, uid : this.uid  } ) );
		this.$el.data('widget', _widget);
		return this.$el;
	};
	_widget.change = function ( value ) {
		_widget.value = value;
		this.$el.val( value );
		this.$el.trigger( 'value:change', [ _widget.uid, _widget.value ] );
	};
	_widget.value = _widget.oData['value'] || '';
	_widget.init = function () {
	};
	_widget.setValue = function ( val, bSilent ) {
		this.value = val;
		if ( !bSilent ) {
			this.$el.trigger('value:change', [ this.uid, this.value ]);
		}
		this.$el.val( this.value );
	};

	return _widget;
}

/**********************************
* File input
* oData : {
* 	value : string (?)
* }
**********************************/
function jFormInputFile ( oData, oForm, sLocalePath ) {
	var _widget = jFormInput( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $(template).find('#file').html() );
	_widget.$render = function () {
		this.$el = $( oTemplate( { name : this.oData.name, value : this.oData.value, uid : this.uid, title : this.getTitle()  } ) );
		this.$el.on('change', 'input', function () {
			if ( this.value != _widget.value ) {
				_widget.value = this.value;
				_widget.$el.find('.filename').text( _widget.value.replace( /^.*(\\|\/)(.+)$/, "$2") );
				_widget.$el.find('.wrapper').addClass('toggled');
				$(this).trigger('value:change', [ _widget.uid, this.value ] );
			}
		});
		return this.$el;
	};
	_widget.value = _widget.oData['value'] || '';
	_widget.init = function () {
	};
	return _widget;
}

/**********************************
* Avatar input
* oData : {
* 	value : current avatar,
* 	buttonTitle : title of the "upload" button
* }
**********************************/
function jFormInputAvatar ( oData, oForm, sLocalePath ) {
	var _widget = jFormInputFile( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $(template).find('#avatar').html() );
	_widget.$render = function () {
		this.$el = $( oTemplate( {
			name : this.oData.name,
			value : this.oData.value,
			uid : this.uid,
			title : this.getTitle(),
			buttonTitle : window.LocaleManager.get( this.sLocalePath + '.' + this.oData.name + '.buttonTitle' )
		} ) );
		if ( this.oData.value ) {
			this.$el.find( '.avatar-img' ).css( 'background-image', 'url(\'' + this.oData.value + '\')' );
		}
		this.$el.on('click', 'input', function () {
//				console.log('avatarClick');
		});
		this.$el.on('change', 'input', function (e) {
			if ( window.FileReader ) {
			// modern browser, hooray!
				var aFiles = e.originalEvent.target.files;
				if ( aFiles.length && aFiles[0].type.match(/^image.+$/i) ) {
					var oFR = new FileReader();
					oFR.onload = (function ( cFile ) { return function (e) {
						_widget.$el.find('.avatar-img').css( {
							'background' : 'transparent url(\'' + e.target.result + '\') 50% 50% no-repeat',
							'background-size' : 'cover'
						} );
					}})( aFiles[0] );
					oFR.readAsDataURL( aFiles[0] );
				}
			}
			e.preventDefault();
			if ( this.value != _widget.value ) {
				_widget.value = this.value;
				_widget.$el.find('.filename').text( _widget.value.replace( /^.*(\\|\/)(.+)$/, "$2") );
				_widget.$el.find('.jf-button').addClass('toggled');
				$(this).trigger('value:change', [ _widget.uid, this.value ] );
			}
			if ( !!oData.autosubmit ) {
				// start upload
				_widget.oForm.$Form.trigger('submit');
			}

		});
		return this.$el;
	};
	_widget.value = _widget.oData['value'] || '';
	_widget.init = function () {
	};
	return _widget;
}
/**********************************
* Visibility input
* oData : {
*		names : [ input1, input2, ... ]
* }
**********************************/
function jFormInputVisibility ( oData, oForm, sLocalePath ) {
	var _widget = jFormInput( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $( template ).find( '#visibility' ).html() );
	_widget.value = {};
	_.each( oData.names, _.bind( function (x) { _widget.value[x] = ( oData.value && oData.value.hasOwnProperty(x) ) ? oData.value[x] : 'all'; }, this ) );
	_widget.$render = function () {
		this.$el = oForm.$Form;
		this.o$Widgets = {};
		var cWidget;
		_.each( oData.names, _.bind( function (x) {
			cWidget = oForm.oWidgetNames[x];
			if ( cWidget ) {
				this.o$Widgets[ x ] = $( oTemplate( { name : oForm.aWidgetLinks[ cWidget ].oData.name, value : this.value[ x ] } ) );
				this.o$Widgets[ x ].append('<input type="hidden" name="' + x + 'Visibility" value="' + ( this.value[x] || 'all' ) + '" />');
				oForm.aWidgetLinks[ cWidget ].$el.find( 'dd' ).append( this.o$Widgets[ x ] );
				if ( this.value.hasOwnProperty( x ) ) {
					this.o$Widgets[ x ].addClass( 'jf-visibility-value-' + this.value[x] );
				}
			}
		}, this ) );
		this.$el.on('click', '.jf-visibility-value', function (e) {
			var $parent = $( e.target ).closest( '.jf-visibility' );
			var sName = $parent.data( 'name' );
			if ( !_widget.value.hasOwnProperty( sName ) || _widget.value[ sName ] != $( this ).data( 'value' ) ) {
				_widget.value[ sName ] = $( this ).data( 'value' );
				$parent[0].className = $parent[0].className.replace( /jf-visibility-value-([a-z]+)/g, '' );
				$parent.addClass( 'jf-visibility-value-' + $( this ).data('value') );
				$parent.find('input[type=hidden]').val( $(this).data('value') );
			}
		});
	};
	_widget.show = function () {
		this.$el.find( '.jf-visibility' ).show();
	};
	_widget.hide = function () {
		this.$el.find( '.jf-visibility' ).hide();
	};
	_widget.init = function () {
	};
	_widget.getValue = function () {
		var oRes = {};
		_.each( this.value, _.bind( function (x,n) {
			oRes[ n + 'Visibility'] = x;
		}, this ) );
		return oRes;
	};
	return _widget;
}
/**********************************
 * Date input
 * oData : {
 *		value : {
 *			day : int 1..31,
 *			month : int 1..12,
 *			year: int
 *		}
 * }
 **********************************/
function jFormInputDate ( oData, oForm, sLocalePath ) {
	var _widget = jFormInput( oData, oForm, sLocalePath );
	var oTemplate = _.exTemplate( $( template ).find( '#date' ).html() );
	var clearNum = _jFormHelpers.fClearNumber( false, false );
	_widget.value = {
		'day' : oData.value && oData.value[2] ? oData.value[2]|0 : '',
		'month' : oData.value && oData.value[1] ? oData.value[1]|0 : 0,
		'year' : oData.value && oData.value[0] ? oData.value[0]|0 : ''
	};
	var aMonths = [ 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december' ];

	_widget.$render = function () {
		this.$el = $( oTemplate({ name : this.oData.name, title : this.getTitle(), uid : this.uid, value : _widget.value }) );
		var $select = this.$el.find('select:first');
		for ( var i = 0; i < 12; i++ ) {
			$select.append('<option value="' + (i+1) + '" ' + ( ( i == (this.value.month-1) || ( !this.value.month && i == 0 ) ) ? ' selected="selected"' : '' ) + '>' + window.LocaleManager.getProperMonthOf( i, true ) + '</option>');
		}
		this.$el.find('.jf-select-container .w-select .value').text( $select.find('option:selected').text() );
		this.$el.on('keyup keypress click change', '.jf-day', function () {
			if ( this.value != _widget.value['day'] ) {
				var clean = clearNum( $(this).val() );
				if ( clean.iVal < 1 ) {
					clean.iVal = 1;
				} else if ( clean.iVal > 31 ) {
					clean.iVal = 31;
				}
				if ( ( this.value|0 ) != clean.iVal ) {
					this.value = clean.iVal;
				}
				if ( clean.iVal != _widget.value['day'] ) {
					_widget.value['day'] = clean.iVal;
					$(this).trigger('value:change', [ _widget.uid, _widget.value ]);
				}
			}
		});
		this.$el.on('keyup keypress click change', '.jf-year', function () {
			if ( this.value != _widget.value['day'] ) {
				var clean = clearNum( $(this).val() );
				clean.sText = clean.sText.substr(0,4);
				if ( this.value != clean.sText ) {
					this.value = clean.sText;
					clean.iVal = clean.sText|0;
				}
				if ( clean.iVal != _widget.value['year'] ) {
					_widget.value['year'] = clean.iVal;
					$(this).trigger('value:change', [ _widget.uid, _widget.value ]);
				}
			}
		});
		this.$el.on('keyup keypress click change', '.jf-month', function () {
			_widget.value['month'] = this.value;
			$(this).trigger('value:change', [ _widget.uid, _widget.value ]);
			_widget.$el.find('.jf-select-container .w-select .value').text( $(this).find('option:selected').text() );
		});
		this.$el.on('focus', '.jf-month', function () {
			$(this).closest('.jf-select-container').addClass('focused');
		});
		this.$el.on('blur', '.jf-month', function () {
			$(this).closest('.jf-select-container').removeClass('focused');
		});
		return this.$el;
	};
	_widget.getValue = function () {
//			return this.value.year + '-' + this.value.month + '-' + this.value.day;
		var oRes = {};
		oRes[ this.oData.name + 'Day' ] = this.value.day;
		oRes[ this.oData.name + 'Month' ] = this.value.month|0 || 1;
		oRes[ this.oData.name + 'Year' ] = this.value.year;
		return oRes;
	};
	_widget.init = function () {
	};
	_widget.hasValue = function () {
		return this.value.day|0 && this.value.year|0;
	};
	_widget.toString = function ( sJoin ) {
		return window.LocaleManager.getHumanDate( this.value.year, ( this.value.month|0 ? this.value.month - 1 : 0 ), this.value.day );
	};
	return _widget;
}
/**********************************
* jForm private methods
**********************************/
var _jForm = {
	parseData : function () {
		this.sId = this.oData['id'];
		this.sUrl = this.oData['url'];
		_jForm.computeLocalePath.call(this);
		this.oData['method'] = this.oData['method'] || 'post';
		this.oData['submitTitle'] = window.LocaleManager.get( this.sLocalePath + '.__submitTitle' );
		this.sAutoFocus = '';
		this.aWidgets = _jForm.parseFields.call( this, this.oData.fields );
	},
	computeLocalePath : function () {
		this.sLocalePath = this.oData.localePath;
		if ( !this.oData.localePath || this.oData.localePath.substr(-1) == '.' ) {
			this.sLocalePath += 'form#' + this.sId;
		}
	},

	parseFields : function ( oFields, sLocalePath ) {
		var cFocusWidget;
		var aWidgets = _.filter( _.map( oFields, _.bind( function ( cField ) {
			return _jForm.parseField.call( this, cField, sLocalePath );
		}, this) ), function (x) {return x;}, this);

		var aFocusTypes = [ 'text', 'textarea', 'number' ];
		_.each( aWidgets, _.bind( function ( x ) {
			if ( aFocusTypes.indexOf( x.oData.type ) != -1 && !cFocusWidget ) {
				cFocusWidget = x.uid;
			}
			if ( x.oData.bAutoFocus ) {
				this.sAutoFocus = x.uid;
			}
			if ( x.oData['type'] != 'fieldset' ) {
				this.aWidgetLinks[ x.uid ] = x;
				this.oWidgetNames[ x.oData.name ] = x.uid;
			}
			if ( x.oData.type == 'file' || x.oData.type == 'avatar' ) {
				this.bIframeSubmit = true;
			}
			if ( x.oData.hasOwnProperty('wysiwyg') ) {
				this.aWysiwygs.push( x.uid );
			}
		}, this) );
		if ( !this.sAutoFocus ) {
			this.sAutoFocus = cFocusWidget || _.first( aWidgets ).uid;
		}
		return aWidgets;
	},

	parseField : function ( oField, sLocalePath ) {
		if ( oField.hasOwnProperty('localePath') && oField.localePath ) {
			sLocalePath = oField.localePath;
		}
		switch ( oField.type ) {
			case 'text':
				return jFormInputText( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'password':
				return jFormInputPassword( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'textarea':
				return jFormInputTextarea( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'number':
				return jFormInputNumber( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'fieldset':
				 return jFormFieldset( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'checkbox':
				return jFormCheckbox( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'checkboxGroup':
				return jFormCheckboxGroup( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'choiceGroup':
				return jFormChoiceGroup( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'radio':
				return jFormInputRadio( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'suggest':
				return jFormInputSuggest( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'select':
				return jFormInputSelect( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'multilevelSelect':
				return jFormInputMultilevelSelect( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'slider':
				return jFormInputSlider( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'hidden':
				return jFormInputHidden( oField, this );
			break;

			case 'file':
				return jFormInputFile( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'avatar':
				return jFormInputAvatar( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'visibility':
				return jFormInputVisibility( oField, this, sLocalePath || this.sLocalePath );
			break;

			case 'date':
				return jFormInputDate( oField, this, sLocalePath || this.sLocalePath );
			break;
		}
	}
};

/**********************************
* jForm public methods
**********************************/
var jForm = function ( oData  ) {
// data
	this.oData = oData;
// widgets collection
	this.aWidgets = [];
// linked widgets for quick search by id
	this.aWidgetLinks = {};
// linked widgets for quick search by name
	this.oWidgetNames = {};
	this.oTemplate = _.exTemplate( $(template).find('#form').html() );
	this.$Form = $( this.oTemplate( this.oData ) );
	this.bRendered = false;
	this.bShown = false;
	this.aWysiwygs = [];
	this.bTrueSubmit = !!this.oData.trueSubmit;
	this.bIframeSubmit = false;
	this.$IFrame = $();
	this.type = this.oData.type || 'simple';
	this.$Submit = $();

	this.$render = function () {
		if ( this.bIframeSubmit ) {
			var sIframeName = 'iframe-' + this.oData.id;
			this.$IFrame = $('<iframe id="' + sIframeName + '" class="jf-fileframe" name="' + sIframeName + '" />');
			this.$Form.attr('enctype', 'multipart/form-data');
			this.$Form.attr('target', sIframeName);
		}
		var $FC = this.$Form.find('.jf-fields:first');
		if ( !this.oData.noSubmit ) {
			var oSubmitTemplate = _.exTemplate( $(template).find('#submit').html() );
			this.$Submit = $( oSubmitTemplate( this.oData ) );
			this.$Form.append( this.$Submit );
		}
		_.each(this.aWidgets, function ( cWidget ) {
			$FC.append( cWidget.$render() );
			cWidget.init();
			cWidget.bindEvents();
		}, this);
		this.bRendered = true;
		return this.$Form;
	};

	this.bindEvents = function () {
		var that = this;
		this.$Form.on('submit', { oForm : this }, function (e) {
			$(this).find('.jf-submit').addClass('loading');
			if ( !e.data.oForm.bIframeSubmit && !e.data.oForm.bTrueSubmit ) {
				e.preventDefault();
				var aValues = that.getValues();
				if ( typeof e.data.oForm.oData.onBeforeSubmit == 'function' ) {
					aValues = e.data.oForm.oData.onBeforeSubmit( aValues );
				}
				var fOnError = function ( d ) {
					e.data.oForm.oData.onError ? e.data.oForm.oData.onError.apply( this, arguments ) : console.log('form error:', d.message || '');
				};
				var fOnSuccess = function ( d ) {
					e.data.oForm.oData.onSuccess ? e.data.oForm.oData.onSuccess.apply( that, arguments ) : console.log('onsuccess default', d);
				};

				if ( typeof e.data.oForm.oData.onSubmit == 'function' ) {
					e.data.oForm.oData.onSubmit.call(this, aValues, fOnSuccess, fOnError );
				} else {
					$.ajax({
						type : e.data.oForm.oData['method'],
						url : e.data.oForm.sUrl,
						data : aValues,
						error : e.data.oForm.oData.onError || function (d) { console.log('form error', d); },
						success : function (d) {
							if ( !d || d.status == 'error' ) {
								fOnError.apply( e.data.oForm, arguments);
								that.enableSubmit();
								that.$Submit.addClass('error');
								that.$Form.one('change', function () { that.$Submit.removeClass('error'); });
							} else {
								fOnSuccess.apply( e.data.oForm, arguments);
							}
						},
						context : this
					});
				}
			} else if ( e.data.oForm.bTrueSubmit ) {
				that.getValues();
				if ( typeof e.data.oForm.oData.onBeforeSubmit == 'function' ) {
					e.data.oForm.oData.onBeforeSubmit();
				}
			} else {
				/**
				 * implement onBeforeSubmit
				 */
				that.getValues();
				if ( typeof e.data.oForm.oData.onBeforeSubmit == 'function' ) {
					e.data.oForm.oData.onBeforeSubmit();
				}
			}
		});
		this.$Form.on('wysiwyg.submit textarea.submit', function (e) {
			e.preventDefault();
//				if ( that.aWysiwygs.length == 1 ) {
				$(this).trigger('submit');
//				}
		});
		this.$Form.on('wysiwyg.disabled', function (e) {
			that.hide();
		});
		/** TODO events **/
		this.$Form.on('value:change', '.jf-field, .jf-fieldset', function ( e, uid, value ) {
			that.checkFilled();
			that.aWidgetLinks[ uid ].value = value;
		});
	};
	this.checkFilled = function () {
		if ( !this.checkRequired() ) {
			this.disableSubmit();
		} else {
			this.enableSubmit();
		}
	};
	this.getValues = function () {
		var oValues = {};
		_.each( this.aWidgetLinks, function ( x ) {
			if ( x.hasValue() ) {
				if ( !_.isObject( x.getValue() ) || x.oData.type == 'textarea' ) {
					oValues[ x.oData.name ] = x.getValue();
				} else if ( _.isArray(x.getValue() ) ) {
					oValues[ x.oData.name ] = x.getValue();
				} else {
					_.assign( oValues, x.getValue() );
				}
			}
		});
		return oValues;
	};
	this.getStringValues = function () {
		var oRes = {};
		_.each( this.aWidgetLinks, function(x) {
			if ( x.hasValue() ) {
				oRes[ x.oData.name ] = x.toString();
			}
		} );
		return oRes;
	};
	this.enableSubmit = function () {
		this.$Submit.find('button').removeAttr('disabled').removeClass('loading disabled toggled');
	};
	this.disableSubmit = function () {
		this.$Submit.find('button').attr('disabled', true).addClass('disabled');
	};
	this.checkRequired = function () {
		return !( _.filter( this.aWidgets, function (x) { return !x.isValid(); }).length );
	};
	this.show = function ( $toReplace ) {
		if ( !this.bRendered ) {
			this.$render();
		} else {
			_.each(this.aWysiwygs, function(x) { this.aWidgetLinks[x].enable(); }, this);
		}
		this.checkFilled();
		this.bindEvents();
		this.$Replaced = $toReplace;
		this.$Form.insertBefore( $toReplace );

		if ( this.sAutoFocus && this.aWidgetLinks[ this.sAutoFocus ] ) {
			this.aWidgetLinks[this.sAutoFocus].setAutoFocus();
		}
		var that = this;
		if ( this.bIframeSubmit ) {
			this.$IFrame.insertAfter( this.$Form );

			this.$IFrame.on('load', function (e) {
				if ( this.contentWindow && this.contentWindow.document ) {
					if ( this.contentWindow.document.body.innerHTML ) {
						( that.oData.onSuccess.bind(that) || (function () { console.log('onsuccess default');}) )( $.parseJSON( $(this.contentWindow.document.body.innerHTML.toString()).html() ) )
					}
				}
//				console.log('ifs', this.contentWindow.document.body.innerHTML, e);
			});
		}
		this.$Replaced.detach();
		this.bShown = true;
		this.$Form.trigger('form.enabled', this.sId);
	};
	this.hide = function () {
		if ( !this.bShown ) {
			return;
		}
		this.bShown = false;
		if ( this.$Replaced && this.$Replaced.length ) {
			this.$Replaced.insertBefore(this.$Form).show();
		}
		_.each(this.aWysiwygs, function(x) { this.aWidgetLinks[x].disable(); }, this);
		this.$Form.off('submit value:change');
		this.$Form.trigger('form.disabled', this.sId);
		this.$Form.detach();
		this.$IFrame.off('load');
		this.$IFrame.detach();
	};
	this.setValue = function ( sName, value, bSilent ){
		if ( this.oWidgetNames.hasOwnProperty( sName ) ) {
			this.aWidgetLinks[ this.oWidgetNames[sName] ].setValue( value, bSilent );
		}
	};

	_jForm.parseData.call(this);
};

_.jForm = function ( oData ) {
	return new jForm( oData );
};
