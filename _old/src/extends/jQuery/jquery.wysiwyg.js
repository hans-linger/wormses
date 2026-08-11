(function ($){

	var bIsOpera = /opera/i.test( navigator.userAgent );
	var aActiveWysiwygs = [];
	var fSanitize = function ( sContent ) {
		var oUp = fSanitizeUp( sContent );
		return fSanitizeDown( oUp.sContent, oUp.sRand );
	};
	var fSplitLong = function ( $el ) {
		if ( $el.html().match(/[a-zа-я]{50,}/) ) {
//			$el.html( $el.html().replace( /([a-zа-я]{50,})/ig, function (p1) { return p1. } ) )
		}
	};
	var fSanitizeUp = function ( sContent ) {
		// prefilter
		var sRand = '_rand' + Math.random().toString().substr(2);
		// good inline tags
		sContent = sContent.replace(/<(\/?)(b|u|i|sub|sup|s|strike)>/ig, '%%' + sRand + '$1$2%%' );
		// br
		sContent = sContent.replace(/(\r\n|\n|\r|\n\r|<div>|<br\s*(\/?)>)/ig, '%%' + sRand + 'br%%' );
		// own links
		sContent = sContent.replace(/<a target="_blank" href="\/url\/\?location=([^"]+)"><span class="externalLink">([^<]+)<\/span><\/a>/ig, '%%' + sRand + 'url_$1_title_$2%%');
		// strip all tags
		sContent = sContent.replace(/<[^>]+>/g, '');
		// replace <> to lt/gt
		sContent = sContent.replace('<', '&lt;').replace('>', '&gt;');
		return { sRand : sRand, sContent : sContent };
	};
	var fSanitizeDown = function ( sContent, sRand ) {
		// now going backwards
		// own links
		sContent = sContent.replace( new RegExp( '%%' + sRand + 'url_(\\S+)_title_(\\S+)%%', 'ig' ), '<a target="_blank" href="/url/?location=$1"><span class="externalLink">$2</span></a>' );
		// good inline tags
		sContent = sContent.replace( new RegExp( '%%' + sRand + '(\\/?)(b|i|u|sup|sub|s)%%', 'g'), '<$1$2>');
		// br
		sContent = sContent.replace( new RegExp( '%%' + sRand + 'br%%', 'g'), '<br />');
		// remove start and trail br
		sContent = sContent.replace(/^(<br \/>)+/gm, '').replace(/(<br \/>)+$/gm, '');
		// remove 2+ br
		sContent = sContent.replace(/(<br \/>){2,}/gm, '<br /><br />');
		return sContent;
	};
//	var sTest = '<a href="er">werwer<b>werw<i>werwer</i>BAB<a class="externalLink" href="/url/?location=qweqweqweqwe://qweqwe">http://local.backbone/#!/user/u2/</a> ABA<br> <br/>  <br  	/>></b></a>';
//	console.log(sTest);
//	console.log( fSanitize( sTest ) );

	var oConfig = {
		bSaveIcon		: false,
		bAutoRun 		: true,
		bNoSubmit 		: true
	};
	var sIconsTemplate = '<button class="i i-bold"><b></b></button><button class="i i-italic"><b></b></button><button class="i i-strikethrough"><b></b></button><button class="i i-superscript"><b></b></button><button class="i i-subscript"><b></b></button><button class="i i-quote"><b></b></button><button class="i i-link"><b></b></button><i class="separator"></i><span class="i i-image"></span><i class="i-close"></i>';
	var sImageIconTemplate = '<form method="post" enctype="multipart/form-data"><span class="jq-wysiwyg-fileWrapper"><input type="file" name="file" /></span></form>';
	var sSaveTemplate = '<button class="i i-save"><b></b></button>';
	var sSubmitTemplate = '<button class="jf-button jf-submit" disabled="disabled"><s>Отправить</s></button>';
	var sImagesContainerTemplate = '<div class="wysiwyg-postImages"></div>';
	var sImageTemplate = '<b><i></i><img src="" /></b>';
	/**
	 * public methods
	 * @param sMethod
	 * @param oOptions
	 */
	var WysiwygMethods = {

		/**
		 * initializing wysiwyg widget
		 * @param oOptions
		 */
		init : function ( oOptions ) {
			var oCurrentConfig = {};
		// if it's already inited, take current config
			if ( $(this).data('wysiwyg') ) {
				oCurrentConfig = $(this).data('wysiwyg').oOptions;
			}
		// overriding config params
			$.extend( oCurrentConfig, oConfig, oOptions || {} );
			if ( !$(this).data('wysiwyg') ) {
				$(this).data('wysiwyg', new Wysiwyg( $(this), oCurrentConfig ) );
			}
			$(this).data('wysiwyg').init( oOptions );

		},

		destroy : function () {
			if ( $(this).data('wysiwyg') ) {
				$(this).data('wysiwyg').destroy();
			}
		},

		enable : function () {
			if ( $(this).data('wysiwyg') ) {
				$(this).data('wysiwyg').enable();
			}
		},

		disable : function () {
			if ( $(this).data('wysiwyg') ) {
				$(this).data('wysiwyg').disable();
			}
		},

		setContent : function ( oContent ) {
			if ( $(this).data('wysiwyg') ) {
				$(this).data('wysiwyg').setContent( oContent );
			}
		}


	};

	var placeCaretAtEnd = function(el) {
		el.focus();
		if (typeof window.getSelection != "undefined"
			&& typeof document.createRange != "undefined") {
			var range = document.createRange();
			range.selectNodeContents(el);
			range.collapse(false);
			var sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		} else if (typeof document.body.createTextRange != "undefined") {
			var textRange = document.body.createTextRange();
			textRange.moveToElementText(el);
			textRange.collapse(false);
			textRange.select();
		}
	};
	/** TODO remove backbone from domain **/
	var rUrlPattern = /([!()?, \n\r\t \u00A0]|>|^|&nbsp;|<br ?\/?>)((https?:\/\/)((?:[a-z0-9_\-]+\.)+([a-z]{2,6}|backbone))(\/.*?)?(\#.*?)?)(<|$|&nbsp;|[ \t\r\n \u00A0]|<br ?\/?>)/i;
	/**
	 *
	 * @param $Node $( parent node )
	 * @param oOptions
	 * {
	 * 	icons : [ name1, name2, name3 ],
	 * 	bNoSubmit : draw submit button or not,
	 * 	bSaveIcon : draw save icon or not,
	 * 	bCloseIcon : draw close or not,
	 *		fOnClose : close callback,
	 *		bAutoRun : open on init or not
	 * }
	 */
	var Wysiwyg = function ( $Node, oOptions ) {
		// :(
		var that = this;
		/**
		 * properties
		 */
		this.bInited = $Node.hasClass('wysiwyg') && $Node.find('.wysiwyg-container:first').length;
		this.$Node = $Node;
		this.$Container = $Node.hasClass('wysiwyg-container') ? $Node : $Node.find('.wysiwyg-container:first');
		this.$Icons = $Node.find('.wysiwyg-icons:first');
		this.$Content = $Node.find('.wysiwyg-content:first');
		this.$Submit = $Node.find('.submit');
		this.$ImagesContainer = $();
		this.oOptions = oOptions;
		this.sOldValue = '';
		this.oRefreshButtonsTimeout = null;
		this.bEnabled = false;
		this.bDragEnabled = true;
		this.oImageUrls = {};
		this.aUrls = [];
		this.aImageUrls = [];
		this.oUrlCache = {};
		this.sId = oOptions.id || 'wysiwyg' + Math.random().toString().substr(2);

		this.init = function ( ) {
			if ( !this.bInited ) {
				var bImageButton = false;
				this.$Node.addClass('j-wysiwyg wysiwyg').attr('id', this.sId);
				this.$Container = this.$Container.length ? this.$Container : this.$Node.append('<div class="wysiwyg-container"></div>');
				if ( !this.$Icons.length || !this.$Icons.children().length ) {
					if ( !this.$Icons.length ) {
						this.$Icons = $('<div class="wysiwyg-icons"></div> ');
						this.$Icons.appendTo( this.$Node );
					}
					this.$Icons.append( sIconsTemplate );
					if ( this.oOptions.icons ) {
						this.$Icons.find('.i').hide();
						for (var i in this.oOptions.icons) if ( this.oOptions.icons.hasOwnProperty( i ) ) {
							if ( this.oOptions.icons[i] == 'image' && this.oOptions.uploadUrl ) {

								var $i = $(sImageIconTemplate);
								$i.attr('target', 'jqiframe' + this.sId).attr('action', this.oOptions.uploadUrl).on('submit', function (e) { e.stopPropagation(); });
								var $iframe = $('<iframe name="jqiframe' + this.sId + '" id="jqiframe' + this.sId + '" />');
								$iframe.on('load', function () {
									if ( this.contentWindow && this.contentWindow.document ) {
										if ( this.contentWindow.document.body.innerHTML ) {
											var d = $.parseJSON( $(this.contentWindow.document.body.innerHTML.toString()).html() );
											if ( d && d.status && d.status == 'success' ) {
												that.aImageUrls.push( d.data.preview );
												that.oImageUrls[ d.data.preview ] = { image : { id : d.data.id } };
												that.addImageThumb(d);
												that.$Content.trigger('change');
											}
										}
									}
								});
								$i.find('input').on('change', function () { $(this).closest('.i').find('form').trigger('submit'); });
								this.$Container.append($iframe);
								this.$Icons.find( '.i-' + this.oOptions.icons[i] ).append($i).css('display', 'inline-block');
							} else {
								this.$Icons.find( '.i-' + this.oOptions.icons[i] ).show();
							}
						}
					}
				}
				if ( !this.$Content.length ) {
					this.$Content = $('<div class="wysiwyg-content">');
					this.$Container.append( this.$Content );
				}
				if ( !this.$Submit.length && !this.oOptions.bNoSubmit ) {
					this.$Submit = $(sSubmitTemplate);
					this.$Container.append( this.$Submit );
				}
				if ( !this.oOptions.bCloseIcon ) {
					this.$Icons.find('.i-close').remove();
				}

				// bind events
				if ( this.oOptions.bImages ) {
					this.$Content.on('drop', function (e) { that.handleDrop(e); });
					this.$Content.on('dragenter', function (e) { that.handleDragEnter(e); });
					this.$Content.on('dragexit dragleave', function (e) { that.handleDragExit(e); });
					this.$Content.on('dragover', function (e) { that.handleDragOver(e); });
				}
				this.$Content.on( 'paste', function() { window.setTimeout( that.handlePaste.bind(that), 10 ) } );
				this.$Content.on( 'keydown', this.handleKeyPress );
				this.$Container.on( 'disable', function() { that.disable(); } );
				this.$Container.on( 'enable', function() { that.enable(); } );
				this.$Icons.on( 'click', '.i', this.handleIconClick );
				this.$Icons.on( 'click', '.i-close', function () { that.disable(); });
				this.$Submit.on( 'click', function () { that.doAction('submit'); } );
				this.$Container.trigger( 'wysiwyg.initialized' );
			} else {

			}
			if ( this.oOptions.bSaveIcon ) {
				if ( !this.$Icons.find('.i-save:first').length ) {
					this.$Icons.append( sSaveTemplate );
				}
			} else {
				if ( this.$Icons.find('.i-save:first').length ) {
					this.$Icons.find('.i-save:first').remove();
				}
			}
			this.$Content.removeClass('wysiwyg-content');
			this.bInited = true;
			if ( this.oOptions.bAutoRun ) {
				this.enable();
			}
		};

		this.enable = function () {
			if ( this.bEnabled ) {
				return;
			}
			this.sOldValue = this.$Content.html();
			this.$Icons.show();
			this.$Content.prop('contenteditable', 'true').addClass('wysiwyg-content');
			this.$Content.focus();
			this.$Container.trigger( 'wysiwyg.enabled' );
//			$('#Content').on('dragenter', this.disableDrag);
//			$('#Content').on('drop', this.enableDrag);
			this.$Content.on('click keydown touchend', that.refreshButtonStates );
			this.$Icons.on('click', that.refreshButtonStates );
			this.$Submit.show();
			this.bEnabled = true;
		};

		this.disable = function () {
			if ( !this.bEnabled ) {
				return;
			}
			window.clearTimeout( this.oRefreshButtonsTimeout );
			this.bEnabled = false;
			this.$Content.off('click keydown touchend', that.refreshButtonStates );
			this.$Icons.off('click', that.refreshButtonStates );
			this.$Icons.hide();
			this.$Content.prop('contenteditable', 'false');
			this.$Content.blur().removeClass('wysiwyg-content');
//			$('#Content').off('dragenter', this.disableDrag);
//			$('#Content').off('drop', this.enableDrag);
			this.$Submit.hide();
			if ( this.oOptions.fOnClose ) {
				this.oOptions.fOnClose.call(this);
			}
			this.$Content.trigger( 'wysiwyg.disabled', { value : this.sOldValue } );
		};

		this.disableDrag = function () {
			if ( this.bDragEnabled ) {
				this.bDragEnabled = false;
				that.$Content.prop('contenteditable', 'false');
			}
		};
		this.enableDrag = function () {
			if ( !this.bDragEnabled ) {
				this.bDragEnabled = true;
				that.$Content.prop('contenteditable', 'true');
			}
		};

		this.handleKeyPress = function ( e ) {
			var iCode = e.charCode || e.keyCode;
			if ( e.ctrlKey ) {
				if ( iCode == 66 /* b */ || iCode == 13 /* return */ || iCode == 73 /* i */ || iCode == 85 /* u */ ) {
					switch ( iCode ) {
						case 66:
							 that.doAction('bold');
						break;

						case 73:
							 that.doAction('italic');
						break;

						case 85:
							 that.doAction('underline');
						break;

						case 13:
							that.doAction('submit');
						break;
					}
					e.preventDefault();
					return false;
				}
			} else if ( iCode == 13 ) {
//				that.doAction('return');
//				return false;
			} else if ( iCode == 27 ) {
				e.preventDefault();
				that.disable();
			}
		};

		this.handlePaste = function ( e ) {
//			console.log(this.$Content.html());
			this.$Content.html( fSanitize( this.$Content.html() ) );
			var str = this.$Content.html(), aMatches, aNewUrls = [], iPrevLen = 0, iReplaceLen = 0, sTempStr;
//			console.log(str);
			while ( str && ( aMatches = str.match( rUrlPattern ) ) ) {
				this.oUrlCache[ aMatches[2] ] = aMatches;
				this.oUrlCache[ aMatches[2] ]['offset'] = iPrevLen;
				iPrevLen += aMatches.index + aMatches[0].length;
				str = str.substr( aMatches.index + aMatches[0].length );
				if ( this.aUrls.indexOf( aMatches[2] ) != -1 || this.aImageUrls.indexOf( aMatches[2] ) != -1 || aNewUrls.indexOf( aMatches[2] ) != -1 ) {
					continue;
				}
				$.ajax({
					type : 'post',
					url : '/app/url',
					data : { location : aMatches[2] },
					success : function (d) {
						if ( d.status && d.status == 'success' ) {

							if ( d.data.type == 'image' && that.oOptions.bImages ) {
								if ( that.aImageUrls.indexOf( d.data.url ) != -1 ) {
									return;
								}
								that.aImageUrls.push( d.data.url );
							// new
								that.oImageUrls[ d.data.preview ] = d.data;
								that.aUrls.push( d.data.url );
								that.addImageThumb(d);
							} else if ( d.data.type == 'unknown' || !that.oOptions.bImages ) {
								sTempStr = fSanitizeUp( that.$Content.html() );
//								console.log('url!', d.data.url );
								that.aUrls.push( d.data.url );

								sTempStr.sContent = sTempStr.sContent.replace( d.data.url, '<a target="_blank" href="/url/?location=' + encodeURIComponent( that.oUrlCache[ d.data.url ][2].replace(/<br ?\/?>/i, '') ) + '"><span class="externalLink">' + that.oUrlCache[ d.data.url ][2] + '</span></a>' );

//								var sNew = that.oUrlCache[ d.data.url ][1] + '<a target="_blank" href="/url/?location=' + encodeURIComponent( that.oUrlCache[ d.data.url ][2].replace(/<br ?\/?>/i, '') ) + '"><span class="externalLink">' + that.oUrlCache[ d.data.url ][2] + '</span></a>' + that.oUrlCache[ d.data.url ][8];
//								console.log( 'cache', that.oUrlCache[ d.data.url ][0], that.oUrlCache[ d.data.url ][2] );
//								console.log( 'replacement', sNew );
//								var sRegExp = '(^|<br ?\/?>|&nbsp;|\s|[\r\n\t])+' + that.oUrlCache[ d.data.url ][2].replace(/(\/|\?)/g, '\\$1') + '(\s|<br ?\/?>|&nbsp;|$)+';
//								console.log('regExp', sRegExp);
//								var rReplace = new RegExp( sRegExp, 'ig' );
//								console.log( 'matches', sTempStr.match(rReplace) );
//								console.log('source', sTempStr);
								that.$Content.html( fSanitizeDown( sTempStr.sContent, sTempStr.sRand ) );
								placeCaretAtEnd( that.$Content[0] );
							}
							that.$Content.trigger('change');
						} else {
						}
					},
					context : this
				});
			}
			that.$Content.trigger('change');
			placeCaretAtEnd( this.$Content[0] );
		};

		this.addImageThumb = function ( d ) {
			if ( !that.$ImagesContainer.length ) {
				that.$ImagesContainer = $( sImagesContainerTemplate ).insertAfter( that.$Content );
				that.$ImagesContainer.on('click', 'i', function () {
					var sUrl = $(this).siblings('img').attr('src');
					if ( sUrl ) {
						$(this).closest('b').remove();
						if ( that.oImageUrls.hasOwnProperty( sUrl ) ) {
							delete that.oImageUrls[ sUrl ];
						}
						var c = 0;
						// fuck that
						for (var i in that.oImageUrls) if ( that.oImageUrls.hasOwnProperty(i) ) c++;
						if ( !c ) {
							that.$ImagesContainer.remove();
							that.$ImagesContainer = $();
						}
						that.$Content.trigger('change');
					}
				});
			}
			var $img = $( sImageTemplate );
			$img.find('img').attr('src', d.data.preview );
			that.$ImagesContainer.append( $img );
		};

		/** dragndrop **/
		this.handleDrop = function ( e ) {
			e.preventDefault();
//			console.log('DROP', e.originalEvent);
		};
		this.handleDragEnter = function ( e ) {
			e.preventDefault();
//			console.log('DRAG-ENTER', e.originalEvent);
		};
		this.handleDragExit = function ( e ) {
			e.preventDefault();
//			console.log('DRAG-EXIT', e.originalEvent);
		};
		this.handleDragOver = function ( e ) {
			e.preventDefault();
			e.stopPropagation();
//			console.log('DRAG-OVER', e.originalEvent);
		};

		this.getValue = function () {
			var str = this.$Content.html();
			//http://www.youtube.com/watch?v=gjKRYSYPNxo
			var f = function (str, p1, p2, p3, p4, p5 ) {
				return '<' + p2 + p3.toLowerCase() + p5 + '>'; };
			var aImgs = [];
			if ( this.oImageUrls ) {
				$.each( this.oImageUrls, function (i, v) {
					aImgs.push( v.image.id );
				});
			}
			return { text: '<data>' + fSanitize(str) + '</data>', images: aImgs };
		};

		this.refreshButtonStates = function ( e ) {
			window.clearTimeout( that.oRefreshButtonsTimeout );
			var iCode = e.charCode || e.keyCode;
			if ( iCode == 27 || $(e.target).hasClass('i-close') || (iCode == 13 && e.ctrlKey) ) {
				// esc pressed
				return;
			}
			that.oRefreshButtonsTimeout = window.setTimeout( function () {
				that.$Icons.find('.i-bold:first').toggleClass('active', document.queryCommandState('Bold'));
				that.$Icons.find('.i-italic:first').toggleClass('active', document.queryCommandState('Italic'));
				that.$Icons.find('.i-strikethrough:first').toggleClass('active', document.queryCommandState('Strikethrough'));
				that.$Icons.find('.i-subscript:first').toggleClass('active', document.queryCommandState('Subscript'));
				that.$Icons.find('.i-superscript:first').toggleClass('active', document.queryCommandState('Superscript'));
				that.$Submit.attr('disabled', that.$Content.text().length ? null : 'disabled' );
			}, 100);
		};

		this.handleIconClick = function ( e ) {
//			console.log('icon click', $(e.target).closest('.i')[0].className.replace(/^.*i-(\S+).*$/, '$1'), e);
			if ( e.target ) {
				var sActionType = $(e.target).closest('.i')[0].className.replace(/^.*i-(\S+).*$/, '$1');

				if ( sActionType != 'image' ) {
					that.$Content.focus();
					that.doAction( sActionType );
					return false;
				} else {
//					console.log('IMAGE');
					return true;
				}
			}
		};

		this.doAction = function ( sActionType, oParams ) {
			oParams = oParams || {};
			switch ( sActionType ) {
				case 'bold':
					document.execCommand('bold', false, null);
				break;

				case 'italic':
					document.execCommand('italic', false, null);
				break;

				case 'underline':
					document.execCommand('underline', false, null);
				break;

				case 'strikethrough':
					document.execCommand('strikethrough', false, null);
				break;

				case 'return':
				break;

				case 'subscript':
					document.execCommand('subscript', false, null);
				break;

				case 'superscript':
					document.execCommand('superscript', false, null);
				break;

				case 'link':

				break;

				case 'image':
					console.log('asd', oParams);

				break;

				case 'submit':
					that.$Container.trigger( 'wysiwyg.submit', { value : that.$Content.html() } );
					if ( !that.oOptions.bNoSubmit ) {
						this.disable();
					}
				break;
			}
		};

		this.setContent = function ( oContent ) {
			if ( typeof oContent == 'string' ) {
				this.$Content.html( oContent );
			} else if ( typeof oContent == 'object' && typeof oContent.html == 'function' ) {
				this.$Content.empty().append( oContent );
			}
		};

		this.isEnabled = function () { return this.bEnabled; }
	};
	/**
	 * plugin itself
	 * takes from 0 to 2 arguments:
	 * 0: takes default method init with empty options
	 * 1: takes single argument as method name if it's a string, or takes method as init and argument as options, if it's an object
	 * 2: if 1st argument is string, takes it as a method name, and if 2nd is an object, takes it as options object
	 */
	$.fn.wysiwyg = function ( /** arguments: method, options | options **/) {
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
		if ( WysiwygMethods.hasOwnProperty( sMethod ) && typeof WysiwygMethods[ sMethod ] == 'function' ) {
			return this.each( function () {
				return WysiwygMethods[ sMethod ].apply( this, [ oOptions ] );
			});
		} else {
			return this;
		}
	}
})(jQuery);