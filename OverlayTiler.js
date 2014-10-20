// OverlayTiler.js
// Copyright (c) 2014 Heganoo
// https://github.com/heganoo/OverlayTiler

var overlaytiler = overlaytiler || {};
overlaytiler.overlay = overlaytiler.overlay || null;
overlaytiler.opacity = overlaytiler.opacity || null;
overlaytiler.dots = overlaytiler.dots || [];

'use strict';

////////////////////////
/// Load
////////////////////////

/**
 * Adds an editable overlay to the map.
 * @param {Image} img
 * @param {google.maps.Map} map
 */
overlaytiler.Load = function ( data, map, callback ) {

  var img = new Image();
  img.src = data.src;

  // sometimes the image hasn't actually loaded
  if ( !img.height ) {
    setTimeout( this.Load.bind( this, data, map, callback ), 50 );
  }

  else {
    if ( overlaytiler.overlay ) {
      overlaytiler.setMap( null );
    }
    overlaytiler.overlay = new overlaytiler.Overlay( data, img );
    overlaytiler.overlay.setMap( map );

    new overlaytiler.Opacity( overlaytiler.overlay );
    map.controls[google.maps.ControlPosition.BOTTOM_LEFT].push( overlaytiler.opacity.getElement() );

    if ( typeof callback === 'function' ) {
      callback( overlaytiler.overlay );
    }
  }
}

////////////////////////
/// The Overlay
////////////////////////

/**
 * A map overlay that allows affine transformations on its image.
 *
 * @constructor
 * @extends google.maps.OverlayView
 * @param {!HTMLImageElement} img  The image to display.
 */
overlaytiler.Overlay = function ( data, img ) {

  var canvas = this.canvas_ = document.createElement( 'canvas' );
  // TODO: calculate the width/height on the fly in case it's larger than 2000px. This should be good enough for now.
  canvas.width = 2000;
  canvas.height = 2000;
  canvas.style.position = 'absolute';
  this.ctx = canvas.getContext( '2d' );
  this.img_ = img;
  this.data_ = data;
};

/**
 * Set to OverlayView.
 * @type {Si.OverlayView}
 */
overlaytiler.Overlay.prototype = new google.maps.OverlayView;

/**
 * The overlay should be offset this number of pixels from the left of the map
 * div when first added.
 * @private
 * @type number
 */
overlaytiler.Overlay.prototype.DEFAULT_X_OFFSET_ = 100;

/**
 * The overlay should be offset this number of pixels from the top of the map
 * div when first added.
 * @private
 * @type number
 */
overlaytiler.Overlay.prototype.DEFAULT_Y_OFFSET_ = 50;

/**
 * The image that has been overlaid and transformed according to the control
 * points (dots).
 * @private
 * @type overlaytiler.ImageSet
 */
overlaytiler.Overlay.prototype.ti_;

/**
 * The points that control the transformation of this overlay.
 * @private
 * @type Array.<overlaytiler.Dot>
 */
overlaytiler.Overlay.prototype.dots_;

/**
 * Adds the image in the top left of the current map viewport.
 * The overlay can be transformed via three control points, and translated via
 * a larger control point that sits in the middle of the image overlay.
 */
overlaytiler.Overlay.prototype.onAdd = function () {
  var proj = this.getProjection();
  var pane = this.getPanes().overlayImage;
  this.getPanes().overlayLayer.appendChild( this.canvas_ );
  var tr, bl;
  var img = this.img_;

  if ( this.data_.ne && this.data_.sw ) {
    var ne = new google.maps.LatLng( this.data_.ne.lat, this.data_.ne.lng );
    var sw = new google.maps.LatLng( this.data_.sw.lat, this.data_.sw.lng );
    overlaytiler.bounds.extend( ne );
    overlaytiler.bounds.extend( sw );
    tr = proj.fromLatLngToContainerPixel( ne );
    bl = proj.fromLatLngToContainerPixel( sw );
  }
  else {
    tr = new google.maps.Point( this.DEFAULT_X_OFFSET_ + img.width, this.DEFAULT_Y_OFFSET_ );
    bl = new google.maps.Point( this.DEFAULT_X_OFFSET_, this.DEFAULT_Y_OFFSET_ + img.height );
  }

  var dots = [
    new overlaytiler.Dot( pane, tr.x, tr.y, 'ne' ),
    new overlaytiler.Dot( pane, bl.x, bl.y, 'sw' )
  ];

  this.dots_ = dots;

  for ( var i = 0, dot; dot = dots[i]; ++i ) {
    google.maps.event.addListener( dot, 'dragstart',
        this.setMapDraggable_.bind( this, false ) );

    google.maps.event.addListener( dot, 'dragend',
        this.setMapDraggable_.bind( this, true ) );

    google.maps.event.addListener( dot, 'change',
        this.renderCanvas_.bind( this ) );
  }

  this.ti_ = new overlaytiler.ImageSet( img, dots[0], dots[1] );
  this.ti_.draw( this.ctx );

  // The Mover allows the overlay to be translated.
  var mover = new overlaytiler.Mover( pane, dots );
  google.maps.event.addListener( mover, 'dragstart',
      this.setMapDraggable_.bind( this, false ) );

  google.maps.event.addListener( mover, 'dragend',
      this.setMapDraggable_.bind( this, true ) );

  this.renderCanvas_();
};

/**
 * Notify that the canvas should be rendered.
 * Essentially limits rendering to a max of 66fps.
 * @private
 */
overlaytiler.Overlay.prototype.renderCanvas_ = function () {
  if ( this.renderTimeout ) {
    return;
  }
  this.renderTimeout = window.setTimeout(
      this.forceRenderCanvas_.bind( this ), 15 );
};

/**
 * Actually renders to the canvas.
 * @private
 */
overlaytiler.Overlay.prototype.forceRenderCanvas_ = function () {

  var dots = this.dots_;
  this.canvas_.style.left = dots[1].x + 'px';
  this.canvas_.style.top = dots[0].y + 'px';

  var ctx = this.ctx;
  ctx.setTransform( 1, 0, 0, 1, 0, 0 ); // identity
  ctx.clearRect( 0, 0, this.canvas_.width, this.canvas_.height );
  this.ti_.setTranslate( dots[1].x, dots[0].y );
  this.ti_.draw( ctx );

  delete this.renderTimeout;
  google.maps.event.trigger( this, 'change' );

  if ( this.afterRender ) {
    this.afterRender();
  }
};

/**
 * Sets the map's draggable option.
 * @private
 * @param {boolean} draggable  Whether the map should be draggable.
 */
overlaytiler.Overlay.prototype.setMapDraggable_ = function ( draggable ) {
  this.getMap().set( 'draggable', draggable );
};

/**
 * Sets the opacity of the overlay.
 * @param {number} opacity  The opacity, from 0.0 to 1.0.
 */
overlaytiler.Overlay.prototype.setOpacity = function ( opacity ) {
  this.canvas_.style.opacity = opacity;
};

/**
 * @inheritDoc
 */
overlaytiler.Overlay.prototype.draw = function () {
  this.renderCanvas_();
};

/**
 * @inheritDoc
 */
overlaytiler.Overlay.prototype.onRemove = function () {
  if ( this.canvas_ ) {
    this.canvas_.parentNode.removeChild( this.canvas_ );
    this.canvas_ = null;
  }

  if ( overlaytiler.opacity ) {
    var opa = overlaytiler.opacity.getElement();
    opa.parentNode.removeChild( opa );
    overlaytiler.opacity = null;
  }

  for ( var i = 0, dot; dot = overlaytiler.dots[i]; ++i ) {
    dot.getCanvas().parentNode.removeChild( dot.getCanvas() );
    dot = [];
  }
};

/**
 * Gets the top left rendered Point of the canvas.
 * @private
 * @return {google.maps.Point} the top left point.
 */
overlaytiler.Overlay.prototype.getTopLeftPoint_ = function () {
  var dots = this.dots_;

  return new google.maps.Point( Math.min( dots[0].x, dots[1].x ), Math.min( dots[0].y, dots[1].y ) );
};

/**
 * Gets all LatLngs for each control dot.
 * @return {Array.<google.maps.LatLng>} LatLngs of control dots.
 */
overlaytiler.Overlay.prototype.getDotLatLngs = function () {
  var proj = this.getProjection();
  var result = [];
  var dots = this.dots_;

  if ( !dots ) {
    setTimeout( this.getDotLatLngs.bind( this ), 50 );
//    return;
  }

  else {
    for ( var i = 0, dot; dot = dots[i]; ++i ) {
      result.push( proj.fromDivPixelToLatLng( new google.maps.Point( dot.x, dot.y ) ) );
    }
    return result;
  }
};

////////////////////////
/// The Dot handles
////////////////////////

/**
 * A draggable Dot, rendered to the page.
 * @constructor
 * @param {Node} parent  the element to add this dot to.
 * @param {number} x  initial x-axis position.
 * @param {number} y  initial y-axis position.
 */
overlaytiler.Dot = function ( parent, x, y, id ) {
  this.x = x;
  this.y = y;

  var el = this.el_ = document.createElement( 'div' );
  el.className = 'dot';
  el.style.position = 'absolute';
  el.style.height = '6px';
  el.style.width = '6px';
  el.style.margin = '-6px';
  el.style.borderRadius = '6px';
  el.style.border = '3px solid rgb(240, 245, 34)';
  el.style.cursor = 'crosshair';
  parent.appendChild( el );

  this.id = id;
  this.onMouseMove_ = this.onMouseMove_.bind( this );
  this.onMouseDown_ = this.onMouseDown_.bind( this );
  this.onMouseUp_ = this.onMouseUp_.bind( this );

  el.addEventListener( 'mousedown', this.onMouseDown_, true );
  window.addEventListener( 'mouseup', this.onMouseUp_, true );

  this.style = el.style;
  this.render();

  overlaytiler.dots.push( this );
};

/**
 * @return {Element} the canvas.
 */
overlaytiler.Dot.prototype.getCanvas = function () {
  return this.el_;
};

/**
 * Renders this dot to the page, at its location.
 */
overlaytiler.Dot.prototype.render = function () {
  this.style.left = this.x + 'px';
  this.style.top = this.y + 'px';
  google.maps.event.trigger( this, 'change' );
};

/**
 * Moves the dot to the current mouse position.
 * @private
 * @param {MouseEvent} e  the event containing coordinates of current mouse
 * position.
 */
overlaytiler.Dot.prototype.onMouseMove_ = function ( e ) {
  this.x += e.clientX - this.cx;
  this.y += e.clientY - this.cy;

  this.render();

  this.cx = e.clientX;
  this.cy = e.clientY;
};

/**
 * Enables editing of the dot's location.
 * @private
 * @param {MouseEvent} e  the event containing coordinates of current mouse
 * position.
 */
overlaytiler.Dot.prototype.onMouseDown_ = function ( e ) {
  this.cx = e.clientX;
  this.cy = e.clientY;
  this.mouseMoveListener_ = google.maps.event.addDomListener( window, 'mousemove', this.onMouseMove_.bind( this ) );
  google.maps.event.trigger( this, 'dragstart' );
};

/**
 * Disables editing of the dot's location.
 * @private
 */
overlaytiler.Dot.prototype.onMouseUp_ = function () {
  if ( this.mouseMoveListener_ ) {
    google.maps.event.removeListener( this.mouseMoveListener_ );
  }
  google.maps.event.trigger( this, 'dragend' );

  this.fixDots_();
};

/**
 * @private
 */
overlaytiler.Dot.prototype.fixDots_ = function () {
  if ( this.id === 'ne' ) {
    this.x = overlaytiler.ImageSet.imgProp.NE_x;
    this.y = overlaytiler.ImageSet.imgProp.NE_y;
  }
  else if ( this.id === 'sw' ) {
    this.x = overlaytiler.ImageSet.imgProp.SW_x;
    this.y = overlaytiler.ImageSet.imgProp.SW_y;
  }
  this.render();
}

////////////////////////
/// The Mover handle
////////////////////////

/**
 * Creates a mover (big dot) that moves a bunch of other dots.
 *
 * @constructor
 * @param {Node} parent  the element to attach this dot to.
 * @param {Array.<overlaytiler.Dot>} dots  the dots that should be moved with
 *    this dot.
 * @extends overlaytiler.Dot
 */
overlaytiler.Mover = function ( parent, dots ) {
  // hide the dot until its position is calculated.
  var dot = new overlaytiler.Dot( parent, -1e5, -1e5, 'mover' );
  dot.controlDots_ = dots;
  dot.getCanvas().className += ' mover';
  dot.getCanvas().style.position = 'absolute';
  dot.getCanvas().style.height = '12px';
  dot.getCanvas().style.width = '12px';
  dot.getCanvas().style.margin = '-12px';
  dot.getCanvas().style.borderRadius = '12px';
  dot.getCanvas().style.border = '6px solid rgb(240, 245, 34)';
  dot.getCanvas().style.cursor = 'move';

  dot.onMouseMove_ = this.onMouseMove_.bind( dot );

  google.maps.event.addListener( dots[0], 'change', this.onDotChange_.bind( dot ) );
  google.maps.event.addListener( dots[1], 'change', this.onDotChange_.bind( dot ) );
  this.onDotChange_.call( dot );

  return dot;
};

/**
 * Repositions the mover to be between the first and third control points.
 * @this overlaytiler.Dot
 * @private
 */
overlaytiler.Mover.prototype.onDotChange_ = function () {
  var dots = this.controlDots_;
  this.x = (dots[0].x + dots[1].x) / 2;
  this.y = (dots[0].y + dots[1].y) / 2;
  this.render();
};

/**
 * Translates a dot.
 * @this overlaytiler.Dot
 * @private
 * @param {overlaytiler.Dot} dot  the dot to move.
 * @param {number} deltax  the amount to move on the x-axis.
 * @param {number} deltay  the amount to move on the y-axis.
 */
overlaytiler.Mover.prototype.translateDot_ = function ( dot, deltax, deltay ) {
  dot.x += deltax;
  dot.y += deltay;
  dot.render();
};

/**
 * @this overlaytiler.Dot
 * @private
 * @param {MouseEvent} e  the event containing coordinates of current mouse
 * position.
 */
overlaytiler.Mover.prototype.onMouseMove_ = function ( e ) {
  var deltax = e.clientX - this.cx;
  var deltay = e.clientY - this.cy;

  this.x += deltax;
  this.y += deltay;

  for ( var i = 0, dot; dot = this.controlDots_[i]; ++i ) {
    overlaytiler.Mover.prototype.translateDot_( dot, deltax, deltay );
  }
  this.render();

  this.cx = e.clientX;
  this.cy = e.clientY;
};

////////////////////////
/// Opacity control
////////////////////////

/**
 * Controls the opacity of an Overlay.
 *
 * @constructor
 * @param {overlaytiler.Overlay} overlay  the overlay to control.
 */
overlaytiler.Opacity = function ( overlay ) {
  var el = document.createElement( 'input' );
  el.type = 'range';
  el.min = 0;
  el.max = 100;
  el.value = 100;
  el.style.width = '200px';
  el.onchange = this.onChange_.bind( this );

  this.overlay = overlay;
  this.el_ = el;
  overlaytiler.opacity = this;
};

/**
 * Called whenever the slider is moved.
 * @private
 */
overlaytiler.Opacity.prototype.onChange_ = function () {
  this.overlay.setOpacity( this.el_.value / 100 );
};

/**
 * Returns the Element, suitable for adding to controls on a map.
 * @return {Element}  the Element.
 */
overlaytiler.Opacity.prototype.getElement = function () {
  return this.el_;
};

////////////////////////
/// ImageSet
////////////////////////

/**
 * An image, tranformed by the anchor of three points.
 *
 * @constructor
 * @param {!HTMLImageElement} img  the image to transform.
 * @param {overlaytiler.Dot} a  the top-left control point.
 * @param {overlaytiler.Dot} b  the bottom-right control point.
 */
overlaytiler.ImageSet = function ( img, a, b ) {
  this.img_ = img;
  this.a_ = a;
  this.b_ = b;
  this.translateX_ = 0;
  this.translateY_ = 0;
};

/**
 * Draws the image to a 2d canvas.
 * @param {CanvasRenderingContext2D} ctx  the canvas2d context to draw to.
 */
overlaytiler.ImageSet.prototype.draw = function ( ctx ) {
  var x1 = this.a_.x;
  var x2 = this.b_.x;

  var y1 = this.a_.y;
  var y2 = this.b_.y;

  var h = this.img_.height;
  var w = this.img_.width;

  var ratioX = (x1 - x2) / w;
  var ratioY = (y2 - y1) / h;
  var ratio = ratioX <= ratioY ? ratioX : ratioY;

  ctx.setTransform( ratio, 0, 0, ratio, 0, 0 );
  ctx.drawImage( this.img_, 0, 0, w, h );

  overlaytiler.ImageSet.imgProp = {};
  overlaytiler.ImageSet.imgProp.NW_x = this.translateX_;
  overlaytiler.ImageSet.imgProp.NW_y = this.translateY_;
  overlaytiler.ImageSet.imgProp.NE_x = this.translateX_ + (w * ratio);
  overlaytiler.ImageSet.imgProp.NE_y = this.translateY_;
  overlaytiler.ImageSet.imgProp.SW_x = this.translateX_;
  overlaytiler.ImageSet.imgProp.SW_y = this.translateY_ + (h * ratio);
}

/**
 * Sets a translation transformation for rendering the image.
 * @param {number} x  the amount to translate by on the x-axis.
 * @param {number} y  the amount to translate by on the y-axis.
 */
overlaytiler.ImageSet.prototype.setTranslate = function ( x, y ) {
  this.translateX_ = x;
  this.translateY_ = y;
};