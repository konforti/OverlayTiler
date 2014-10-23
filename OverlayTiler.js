// OverlayTiler.js
// Copyright (c) 2014 Heganoo
// https://github.com/heganoo/OverlayTiler

var overlaytiler = overlaytiler || {};
overlaytiler.overlay = overlaytiler.overlay || null;
overlaytiler.opacity = overlaytiler.opacity || null;

'use strict';

////////////////////////
/// Load
////////////////////////

/**
 * Adds an editable overlay to the map.
 *
 * @param data
 * @param map
 * @param callback
 * @constructor
 */
overlaytiler.Load = function ( data, map, callback ) {

  var img = new Image();
  img.src = data.src;

  img.onload = function() {
    if ( overlaytiler.overlay ) {
      overlaytiler.overlay.setMap( null );
    }
    overlaytiler.overlay = new overlaytiler.Overlay( data, img );
    overlaytiler.overlay.setMap( map );

    new overlaytiler.Opacity( overlaytiler.overlay );
    map.controls[google.maps.ControlPosition.BOTTOM_LEFT].push( overlaytiler.opacity.getElement() );

    google.maps.event.addListener(map, 'zoom_changed', function() {
      overlaytiler.overlay.calibrationRenderImage_();
    });

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
 * @param data
 * @param img
 * @constructor
 */
overlaytiler.Overlay = function ( data, img ) {
  img.style.position = 'absolute';
  this.img_ = img;
  this.data_ = data;
};

/**
 * Set to OverlayView.
 *
 * @type {google.maps.OverlayView}
 */
overlaytiler.Overlay.prototype = new google.maps.OverlayView;

/**
 * * The overlay should be offset this number of pixels from the left of the map
 * div when first added.
 *
 * @type {number}
 * @private
 */
overlaytiler.Overlay.prototype.bounds_;

/**
 * * The overlay should be offset this number of pixels from the left of the map
 * div when first added.
 *
 * @type {number}
 * @private
 */
overlaytiler.Overlay.prototype.DEFAULT_X_OFFSET_ = 100;

/**
 * The overlay should be offset this number of pixels from the top of the map
 * div when first added.
 *
 * @type {number}
 * @private
 */
overlaytiler.Overlay.prototype.DEFAULT_Y_OFFSET_ = 50;

/**
 * Adds the image in the top left of the current map viewport.
 * The overlay can be transformed via three control points, and translated via
 * a larger control point that sits in the middle of the image overlay.
 */
overlaytiler.Overlay.prototype.onAdd = function () {

  this.setImgBounds();

  // Set projection and pane.
  var proj = this.getProjection();
  var pane = this.getPanes().overlayImage;

  // Append the image as a layer to the map.
  this.getPanes().overlayLayer.appendChild( this.img_ );

  var topRight, bottomLeft, img = this.img_;

  if ( this.data_.ne && this.data_.sw ) {
    // Set the bounds from external data.
    var ne = new google.maps.LatLng( this.data_.ne.lat, this.data_.ne.lng );
    var sw = new google.maps.LatLng( this.data_.sw.lat, this.data_.sw.lng );

    topRight = proj.fromLatLngToContainerPixel( ne );
    bottomLeft = proj.fromLatLngToContainerPixel( sw );
  }
  else {
    // // Set the bounds defaults.
    topRight = new google.maps.Point( this.DEFAULT_X_OFFSET_ + img.width, this.DEFAULT_Y_OFFSET_ );
    bottomLeft = new google.maps.Point( this.DEFAULT_X_OFFSET_, this.DEFAULT_Y_OFFSET_ + img.height );
  }

  // The Mover allows the overlay to be translated.
  var mover = new overlaytiler.Mover( pane, bottomLeft.x, topRight.y, this );
  this.mover_ = mover;

  google.maps.event.addListener( mover, 'dragstart',
      this.setMapDraggable_.bind( this, false ) );

  google.maps.event.addListener( mover, 'dragend',
      this.setMapDraggable_.bind( this, true ) );

  google.maps.event.addListener( mover, 'change',
      this.renderImage_.bind( this ) );

  // The Resizer allows the overlay to be resize.
  var resizer = new overlaytiler.Resizer( pane, topRight.x, bottomLeft.y, this );
  this.resizer_ = resizer;

  google.maps.event.addListener( resizer, 'dragstart',
      this.setMapDraggable_.bind( this, false ) );

  google.maps.event.addListener( resizer, 'dragend',
      this.setMapDraggable_.bind( this, true ) );

  google.maps.event.addListener( resizer, 'change',
      this.renderImage_.bind( this ) );

  this.renderImage_();

  // Invoke afterAdd hook.
  if ( this.afterAdd ) {
    this.afterAdd();
  }
};

/**
 * Notify that the image should be rendered in calibration.
 *
 * @private
 */
overlaytiler.Overlay.prototype.calibrationRenderImage_ = function () {
  var img = this.img_;
  var resizer = this.resizer_;
  var mover = this.mover_;
  var bounds = this.bounds_;
  var proj = this.getProjection();

  // Get the pixel size from the image bounds.
  var sw = proj.fromLatLngToDivPixel(bounds.getSouthWest());
  var ne = proj.fromLatLngToDivPixel(bounds.getNorthEast());

  // Set the image style.
  img.style.left = sw.x + 'px';
  img.style.top = ne.y + 'px';
  img.style.width = (ne.x - sw.x) + 'px';

  // Re-locate the mover handle.
  mover.x = sw.x;
  mover.y = ne.y;
  mover.render();

  // Re-locate the resizer handle.
  resizer.x = ne.x;
  resizer.y = sw.y;
  resizer.render();

  delete this.renderTimeout;
  google.maps.event.trigger( this, 'change' );

};

/**
 * Notify that the image should be rendered.
 * Essentially limits rendering to a max of 66fps.
 *
 * @private
 */
overlaytiler.Overlay.prototype.renderImage_ = function () {
  if ( this.renderTimeout ) {
    return;
  }
  this.renderTimeout = window.setTimeout(
      this.forceRenderImage_.bind( this ), 15 );

  this.setImgBounds();
};

/**
 * Actually renders to the canvas.
 *
 * @private
 */
overlaytiler.Overlay.prototype.forceRenderImage_ = function () {
  var resizer = this.resizer_;
  var mover = this.mover_;
  var img = this.img_;

  // Set the image style.
  img.style.left = mover.x + 'px';
  img.style.top = mover.y + 'px';
  img.style.width = (resizer.x - mover.x) + 'px';

  delete this.renderTimeout;
  google.maps.event.trigger( this, 'change' );

  // Invoke afterRender hook.
  if ( this.afterRender ) {
    this.afterRender();
  }
};

/**
 * Sets the map's draggable option.
 *
 * @private
 * @param {boolean} draggable  Whether the map should be draggable.
 */
overlaytiler.Overlay.prototype.setMapDraggable_ = function ( draggable ) {
  this.getMap().set( 'draggable', draggable );
};

/**
 * Sets the opacity of the overlay.
 *
 * @param {number} opacity  The opacity, from 0.0 to 1.0.
 */
overlaytiler.Overlay.prototype.setOpacity = function ( opacity ) {
  this.img_.style.opacity = opacity;
};

/**
 * @inheritDoc
 */
overlaytiler.Overlay.prototype.draw = function () {};

/**
 * @inheritDoc
 */
overlaytiler.Overlay.prototype.onRemove = function () {
  // Remove the image.
  if ( this.img_ ) {
    this.img_.parentNode.removeChild( this.img_ );
    this.img_ = null;
  }

  // Remove the opacity element.
  if ( overlaytiler.opacity ) {
    var opa = overlaytiler.opacity.getElement();
    opa.parentNode.removeChild( opa );
    overlaytiler.opacity = null;
  }

  // Remove the resizer handle.
  this.resizer_.getElement().parentNode.removeChild( this.resizer_.getElement() );
  this.resizer_ = null;

  // Remove the mover handle.
  this.mover_.getElement().parentNode.removeChild( this.mover_.getElement() );
  this.mover_ = null;
};

/**
 * Gets image bounds.
 *
 * @return {Array.<google.maps.LatLng>} LatLngs of control resizer.
 */
overlaytiler.Overlay.prototype.getImgBounds = function () {
  return this.bounds_ ;
};

/**
 * Sets image bounds.
 */
overlaytiler.Overlay.prototype.setImgBounds = function () {
  var proj = this.getProjection();
  var img = this.img_;

  // Get the LatLng value of the image bounds.
  var swBound = proj.fromDivPixelToLatLng( new google.maps.Point( img.x, (img.y + img.height) ) );
  var neBound = proj.fromDivPixelToLatLng( new google.maps.Point( (img.x + img.width), img.y ) );

  // Update the bounds.
  this.bounds_ = new google.maps.LatLngBounds(swBound, neBound);
}

////////////////////////
/// The Mover handle
////////////////////////

/**
 * Creates a mover (big resizer) that moves a bunch of other resizer.
 *
 * @constructor
 * @param {Node} parent  the element to attach this resizer to.
 * @param {Array.<overlaytiler.Resizer>} resizer  the resizer that should be moved with
 *    this resizer.
 * @extends overlaytiler.Resizer
 */
overlaytiler.Mover = function ( parent, x, y, overlay ) {

  var el = this.el_ = document.createElement( 'div' );
  el.className += ' mover';
  el.innerText += '☐';
  el.style.position = 'absolute';
  el.style.color = 'black';
  el.style.fontSize = '24px';
  el.style.fontWeight = 'bold';
  el.style.background = 'yellow';
  el.style.width = '24px';
  el.style.height = '24px';
  el.style.textAlign =  'center';
  el.style.lineHeight = '1';
  el.style.margin = '-10px';
  el.style.cursor = 'move';
  parent.appendChild( el );
  el.onMouseMove_ = this.onMouseMove_.bind( el );

  this.onMouseMove_ = this.onMouseMove_.bind( this );
  this.onMouseDown_ = this.onMouseDown_.bind( this );
  this.onMouseUp_ = this.onMouseUp_.bind( this );

  el.addEventListener( 'mousedown', this.onMouseDown_, true );
  window.addEventListener( 'mouseup', this.onMouseUp_, true );

  this.x = x;
  this.y = y;
  this.overlay_ = overlay;
  this.style = el.style;
  this.render();
};

/**
 * @returns {HTMLElement|*}
 */
overlaytiler.Mover.prototype.getElement = function () {
  return this.el_;
};

/**
 * Renders this mover to the page, at its location.
 */
overlaytiler.Mover.prototype.render = function () {
  this.style.left = this.x +'px';
  this.style.top = this.y + 'px';
  google.maps.event.trigger( this, 'change' );
};

/**
 * Moves the resizer to the current mouse position.
 *
 * @private
 * @param {MouseEvent} e  the event containing coordinates of current mouse
 * position.
 */
overlaytiler.Mover.prototype.onMouseMove_ = function ( e ) {
  this.x += e.clientX - this.cx;
  this.y += e.clientY - this.cy;

  var resizer = this.overlay_.resizer_;
  var img = this.overlay_.img_;

  resizer.x = this.x + img.width;
  resizer.y = this.y + img.height;
  resizer.render();

  this.render();

  this.cx = e.clientX;
  this.cy = e.clientY;
};

/**
 * Enables editing of the resizer's location.
 *
 * @private
 * @param {MouseEvent} e  the event containing coordinates of current mouse
 * position.
 */
overlaytiler.Mover.prototype.onMouseDown_ = function ( e ) {
  this.cx = e.clientX;
  this.cy = e.clientY;
  this.mouseMoveListener_ = google.maps.event.addDomListener( window, 'mousemove', this.onMouseMove_.bind( this ) );
  google.maps.event.trigger( this, 'dragstart' );
};

/**
 * Disables editing of the resizer's location.
 *
 * @private
 */
overlaytiler.Mover.prototype.onMouseUp_ = function () {
  if ( this.mouseMoveListener_ ) {
    google.maps.event.removeListener( this.mouseMoveListener_ );
  }
  google.maps.event.trigger( this, 'dragend' );
};

////////////////////////
/// The Resizer handles
////////////////////////

/**
 * A draggable Resizer, rendered to the page.
 *
 * @param parent
 * @param x
 * @param y
 * @param img
 * @constructor
 */
overlaytiler.Resizer = function ( parent, x, y, overlay ) {

  var el = this.el_ = document.createElement( 'div' );
  el.className = 'resizer';
  el.innerText = '⇲';
  el.style.position = 'absolute';
  el.style.color = 'black';
  el.style.fontSize = '24px';
  el.style.fontWeight = 'bold';
  el.style.background = 'yellow';
  el.style.width = '24px';
  el.style.height = '24px';
  el.style.textAlign =  'center';
  el.style.lineHeight = '1';
  el.style.margin = '-18px';
  el.style.cursor = 'nwse-resize';
  parent.appendChild( el );

  this.onMouseMove_ = this.onMouseMove_.bind( this );
  this.onMouseDown_ = this.onMouseDown_.bind( this );
  this.onMouseUp_ = this.onMouseUp_.bind( this );

  el.addEventListener( 'mousedown', this.onMouseDown_, true );
  window.addEventListener( 'mouseup', this.onMouseUp_, true );

  this.x = x;
  this.y = y;
  this.overlay_ = overlay;
  this.style = el.style;
  this.render();
};

/**
 * @returns {HTMLElement|*}
 */
overlaytiler.Resizer.prototype.getElement = function () {
  return this.el_;
};

/**
 * Renders this resizer to the page, at its location.
 */
overlaytiler.Resizer.prototype.render = function () {
  var mover = this.overlay_.mover_;
  var img = this.overlay_.img_;

  this.style.left = (mover.x + img.width) +'px';
  this.style.top = (mover.y + img.height) + 'px';

  google.maps.event.trigger( this, 'change' );
};

/**
 * Moves the resizer to the current mouse position.
 *
 * @private
 * @param {MouseEvent} e  the event containing coordinates of current mouse
 * position.
 */
overlaytiler.Resizer.prototype.onMouseMove_ = function ( e ) {
  this.x += e.clientX - this.cx;
  this.y += e.clientY - this.cy;

  this.render();

  this.cx = e.clientX;
  this.cy = e.clientY;
};

/**
 * Enables editing of the resizer's location.
 *
 * @private
 * @param {MouseEvent} e  the event containing coordinates of current mouse
 * position.
 */
overlaytiler.Resizer.prototype.onMouseDown_ = function ( e ) {
  this.cx = e.clientX;
  this.cy = e.clientY;
  this.mouseMoveListener_ = google.maps.event.addDomListener( window, 'mousemove', this.onMouseMove_.bind( this ) );
  google.maps.event.trigger( this, 'dragstart' );
};

/**
 * Disables editing of the resizer's location.
 *
 * @private
 */
overlaytiler.Resizer.prototype.onMouseUp_ = function () {
  if ( this.mouseMoveListener_ ) {
    google.maps.event.removeListener( this.mouseMoveListener_ );
  }
  google.maps.event.trigger( this, 'dragend' );
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
 *
 * @private
 */
overlaytiler.Opacity.prototype.onChange_ = function () {
  this.overlay.setOpacity( this.el_.value / 100 );
};

/**
 * Returns the Element, suitable for adding to controls on a map.
 *
 * @return {Element}  the Element.
 */
overlaytiler.Opacity.prototype.getElement = function () {
  return this.el_;
};