// fuck ie8
if (!String.prototype.trim) { String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g,''); }; }

var oExTemplates = {};
var rTemplates = /<%(lang|data)\s*\(\s*('|")([^,'")]+)('|")(,\s*([^)]+))*\s*\)\s*%>/ig;
var oEventMap = {
	lang : {
		sEventName		: 'locale:loaded',
		oHandler		: 'deferredLocale',
		sIdPrefix		: 'deferredLocale_',
		oDataStorage	: 'LocaleManager'
	},
	data : {
		sEventName 		: 'data:loaded',
		oHandler 		: 'deferredData',
		sIdPrefix		: 'deferredData_',
		oDataStorage	: 'DataManager'
	}
};

var genReplaceString = function ( sRandId ) {
	return '<i class="' + sRandId + '"></i>';
};

var ExTemplate = {

	parseLang : function ( str, data, sTemplateId ) {
		sTemplateId = sTemplateId || _.uniqueId( 'exTemplate_' );
//
		var oMatches, aPath, sRandId, aVars = [], sReady = '';
		while ( oMatches = rTemplates.exec( str ) ) {
			var oBind = oEventMap[ oMatches[1] ] || oEventMap['data'];
			if ( !oMatches[3] ) {
				continue;
			}
			if ( oMatches[6] ) {
				aVars = _.map( oMatches[6].split(/,\s*/g), function (x) { return x.replace(/^\s+|\s+$/, '');  });
			}
			var aParsedVars = [];
			if ( aVars.length ) {
				 aParsedVars = ExTemplate.getVarValues( aVars, data );
			}
			sReady = window[oBind.oDataStorage].get( oMatches[3], aParsedVars.length ? aParsedVars : null );
			if ( !sReady ) {
				aPath = oMatches[3].split('.',1);
				//|| ('%' + oMatches[2] + '%');
				sRandId = _.uniqueId( oBind.sIdPrefix );
				window.BootLoader.addRequest(
					 oBind.sEventName,
					 this[oBind.oHandler],
					 {
						 sTemplateId : sTemplateId,
						 sRandId : sRandId,
						 aVars : aParsedVars,
						 sInitialPath : oMatches[3]
					 },
					 this
//						 _.union( [ sTemplateId, sRandId, oMatches[2] ], aParsedVars || [] )
				);
				sReady = genReplaceString( sRandId );
			}

			str = str.replace(oMatches[0], sReady || '' );
			rTemplates.lastIndex -= oMatches[0].length - sReady.length;
		}
		return str;
	},

	getVarValues : function ( aVars, oData ) {
		var t;
		return _.map( aVars, function (x) {
			x = x.toString().replace(/^("|')|("|')$/g,'');
			if ( x.match(/^\d+$/) ) {
				return x;
			} else {
				t = _.dive( oData, x );
				return typeof t == 'undefined' ? x : t;
			}
		});
	},

	deferredLocale : function ( oEventInfo, oParams ) {
	// парсим значение переменных в данных
		var aValues = ExTemplate.getVarValues( oParams.aVars, oExTemplates[ oParams.sTemplateId ].oData );
	// ищем значения в локали
		var sRes = window.LocaleManager.get( oParams.sInitialPath, aValues );

	// если уже есть псевдоэлементы на странице, меняем их на значение
		var aElements = document.getElementsByClassName( oParams.sRandId );
		if ( sRes.length && aElements.length) {
			for ( var i = 0; i < aElements.length; i++ ) {
				aElements[i].parentNode.innerHTML = aElements[i].parentNode.innerHTML.replace( genReplaceString( oParams.sRandId ), sRes);
			}
		}
	// меняем псевдоэлементы в исходнике шаблона
		oExTemplates[ oParams.sTemplateId ].sSrc = oExTemplates[ oParams.sTemplateId ].sSrc.replace( genReplaceString( oParams.sRandId ), sRes );

//			oExTemplates[ oParams.sTemplateId ].sSrc = parseTemplate( oExTemplates[sTemplateId].sSrc, oExTemplates[sTemplateId].oData);

		if ( oExTemplates[ oParams.sTemplateId ] ) {
			oExTemplates[ oParams.sTemplateId ].fTemplate = _.template( oExTemplates[ oParams.sTemplateId ].sSrc, oExTemplates[ oParams.sTemplateId ].oData );
		}
		return true;
	},

	deferredData : function ( oEventInfo, oParams ) {
		var aValues = ExTemplate.getVarValues( oParams.aVars, oExTemplates[ oParams.sTemplateId ].oData );
		var sRes = window.DataManager.get( oParams.sInitialPath, aValues );
		var aElements = document.getElementsByClassName( oParams.sRandId );
		if ( sRes ) {
			if ( sRes.length && aElements.length) {
				for ( var i = 0; i < aElements.length; i++ ) {
					aElements[i].parentNode.innerHTML = aElements[i].parentNode.innerHTML.replace( genReplaceString( oParams.sRandId ), sRes);
				}
			}
			oExTemplates[ oParams.sTemplateId ].sSrc = oExTemplates[ oParams.sTemplateId ].sSrc.replace( genReplaceString( oParams.sRandId ) , sRes );
			if ( oExTemplates[ oParams.sTemplateId ] ) {
				oExTemplates[ oParams.sTemplateId ].fTemplate = _.template( oExTemplates[ oParams.sTemplateId ].sSrc, oExTemplates[ oParams.sTemplateId ].oData );
			}
		}
		return true;
	}

};

/**
 * SYNTAX
 * <%lang( $localePath[, $param1[, $param2,...] ] )%>
 */
/** TODO make proper description **/
/** TODO solve pre-caching problem **/
_.exTemplate = function ( str, data ) {
// если нет менеджера локалей, прокидываем на true-underscore template
	if (!window.LocaleManager) {
		return _.template( str.trim(), data );
	}
// создаем шаблон и пишем в кеш
	var sTemplateId = _.uniqueId( 'exTemplate_' );
	oExTemplates[ sTemplateId ] = {
	// стандартный шаблон
		fTemplate : _.template( ExTemplate.parseLang( str.trim(), data, sTemplateId ), data ),
		sSrc : str.trim(),
		oData : data
	};

	if ( data && typeof data == 'object' ) {
	// если присутствует второй параметр и он объект, возвращаем отрендеренный результат
		return oExTemplates[ sTemplateId ].fTemplate;
	} else {
	// если это pre-cache, возвращаем функцию
		return function ( newData ) {
			if ( typeof oExTemplates[ sTemplateId ].fTemplate == 'function' ) {
				return _.template( ExTemplate.parseLang( oExTemplates[sTemplateId].sSrc, newData, sTemplateId ) )( newData );
			} else {
				return oExTemplates[ sTemplateId ].fTemplate;
			}
		};
	}
};