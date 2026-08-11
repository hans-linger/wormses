var Layout = require('../layouts/layout');
var lMain = require('../layouts/main/layout');
var LayoutManagerData = {
	'main' : lMain
};
var sCurrentLayout = '';
var oCurrentLayout = null;
var LayoutManagerPrivate = {
	getLayout : function ( sName, oOptions ) {
		if ( LayoutManagerData.hasOwnProperty( sName ) ) {
			if ( sCurrentLayout == sName && oCurrentLayout ) {
				// clear sections
				oCurrentLayout.hideSections();
			} else {
				if ( oCurrentLayout ) {
					oCurrentLayout.hide();
				}
				sCurrentLayout = sName;
				oCurrentLayout = new Layout( LayoutManagerData[ sName ] );
			}
			return oCurrentLayout;
		} else {
			return false;
		}
	}
};
var LayoutManagerPublic = function () {
	this.getLayout = function ( sName, oOptions ) {
		return LayoutManagerPrivate.getLayout( sName, oOptions );
	};

	this.drawSection = function ( oLayoutInfo, $el ) {
		if ( oCurrentLayout && oLayoutInfo.hasOwnProperty( sCurrentLayout ) ) {
			return oCurrentLayout.drawSection( oLayoutInfo[sCurrentLayout], $el );
		}
	};

	this.appendTo = function ( sSectionName, sContent, sSelector ) {
		if ( oCurrentLayout ) {
			oCurrentLayout.appendTo( sSectionName, sContent, sSelector );
		}
	};
};
window.LayoutManager = new LayoutManagerPublic();