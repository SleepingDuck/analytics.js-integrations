'use strict';

/**
 * Module dependencies.
 */

var integration = require('@segment/analytics.js-integration');
var push = require('global-queue')('gtagDataLayer', { wrap: false });
var Track = require('segmentio-facade').Track;
var reject = require('reject');
var defaults = require('@ndhoule/defaults');

/**
 * Expose `GTAG`.
 *  Purposely using different data-layer name to avoid conflicts
 *  with any other tool.
 */

var GTAG = (module.exports = integration('Gtag')
  .global('gtagDataLayer')
  .option('gaWebMeasurementId', '')
  .option('gaWebAppMeasurementId', '')
  .option('awConversionId', '')
  .option('dcFloodLightId', '')
  .option('trackAllPages', false)
  .option('trackNamedPages', true)
  .option('trackCategorizedPages', true)
  .option('gaOptions', {
    classic: false,
    enhancedEcommerce: false,
    setAllMappedProps: true
  })
  .tag(
    '<script src="//www.googletagmanager.com/gtag/js?id={{ accountId }}&l=gtagDataLayer">'
  ));

GTAG.on('construct', function(Integration) {
  /* eslint-disable */
  if (Integration.options.gaOptions.classic) {
      Integration.page = Integration.pageClassic;
      Integration.orderCompleted = Integration.orderCompletedClassic;
    } else if (Integration.options.gaOptions.enhancedEcommerce) {
      Integration.productListViewed = Integration.productListViewedEnhanced;
      Integration.productClicked = Integration.productClickedEnhanced;
      Integration.productViewed = Integration.productViewedEnhanced;
      Integration.productAdded = Integration.productAddedEnhanced;
      Integration.productRemoved = Integration.productRemovedEnhanced;
      Integration.promotionViewed = Integration.promotionViewedEnhanced;
      Integration.promotionClicked = Integration.promotionClickedEnhanced;
      Integration.checkoutStarted = Integration.checkoutStartedEnhanced;
      Integration.orderRefunded = Integration.orderRefundedEnhanced;
      Integration.orderCompleted = Integration.orderCompletedEnhanced;
      Integration.checkoutStepViewed = Integration.checkoutStepViewedEnhanced;
      Integration.checkoutStepCompleted =
        Integration.checkoutStepCompletedEnhanced;
      Integration.orderUpdated = Integration.orderUpdatedEnhanced;

      // Additional event on top og GA destination
      Integration.productAddedToWishlist = Integration.productAddedToWishlistEnhanced;
      Integration.productShared = Integration.productSharedEnhanced;

      // There is no corrosponding event present for following in segment like
      // loggedIn, timingCompleted, leadGenerated

      // Integration.loggedIn = Integration.loggedInEnhanced;
      // Integration.signedUp = Integration.signedUpEnhanced;
      // Integration.exceptionOccured = Integration.exceptionOccuredEnhanced;
      // Integration.timingCompleted = Integration.timingCompletedEnhanced;
      // Integration.leadGenerated = Integration.leadGeneratedEnhanced;
      // Integration.setCheckoutOption = Integration.setCheckoutOptionEnhanced;

      // This mapping is for events which are not supported by segment and will
      // be tracked by track method.
      Integration.customEventsMapping = {
        login: Integration.loggedInEnhanced,
        sign_up: Integration.signedUpEnhanced,
        exception: Integration.exceptionOccuredEnhanced,
        timing_complete: Integration.timingCompletedEnhanced,
        generate_lead: Integration.leadGeneratedEnhanced,
        set_checkout_option :Integration.setCheckoutOptionEnhanced
      };

      // There is no corrosponding event present for this in gtagjs
      // REF: https://developers.google.com/gtagjs/reference/event

      // Integration.productListFiltered = Integration.productListFilteredEnhanced;
    }
    /* eslint-enable */
});

/**
 * Initialize.
 *
 * https://developers.google.com/gtagjs
 *
 * @api public
 */

GTAG.prototype.initialize = function() {
  var config = [];
  var that = this;
  var gaOptions = this.options.gaOptions;
  var gaWebMeasurementId = this.options.gaWebMeasurementId;
  var gaWebAppMeasurementId = this.options.gaWebAppMeasurementId;
  var awConversionId = this.options.awConversionId;
  var dcFloodLightId = this.options.dcFloodLightId;
  var accountId =
    gaWebMeasurementId ||
    gaWebAppMeasurementId ||
    awConversionId ||
    dcFloodLightId;

  if (gaWebMeasurementId) {
    config.push(['config', gaWebMeasurementId]);
    if (gaOptions && Object.keys(gaOptions).length) {
      // set custom dimension and metrics if present
      // To Set persistent values we need to use set instead of config
      // https://developers.google.com/analytics/devguides/collection/gtagjs/setting-values

      push('config', gaWebMeasurementId, {
        custom_map: merge(gaOptions.dimensions, gaOptions.metrics)
      });
    }
  }

  if (gaWebAppMeasurementId) {
    config.push(['config', gaWebAppMeasurementId]);
    if (gaOptions && Object.keys(gaOptions).length) {
      // set custom dimension and metrics if present
      // To Set persistent values we need to use set instead of config
      // https://developers.google.com/analytics/devguides/collection/gtagjs/setting-values

      push('config', gaWebAppMeasurementId, {
        custom_map: merge(gaOptions.dimensions, gaOptions.metrics)
      });
    }
  }

  if (awConversionId) {
    config.push(['config', awConversionId]);
  }

  if (dcFloodLightId) {
    config.push(['config', dcFloodLightId]);
  }

  if (!accountId) {
    return;
  }

  this.load({ accountId: accountId }, function() {
    // Default routing.
    for (var i = 0; i < config.length; i++) {
      push(config[i][0], config[i][1]);
    }
    that.ready();
  });
};

/**
 * Loaded?
 *
 * @api private
 * @return {boolean}
 */

GTAG.prototype.loaded = function() {
  return !!(
    window.gtagDataLayer && Array.prototype.push !== window.gtagDataLayer.push
  );
};

/**
 * Identify.
 *
 * @api public
 * @param {Identify} event
 */

GTAG.prototype.identify = function(identify) {
  var userId = identify.userId();
  if (!userId) {
    return;
  }
  if (this.options.gaWebMeasurementId) {
    push('config', this.options.gaWebMeasurementId, {
      user_id: userId
    });
  }
  if (this.options.gaWebAppMeasurementId) {
    push('config', this.options.gaWebAppMeasurementId, {
      user_id: userId
    });
  }
};

/**
 * Track
 *
 * @api public
 * @param {Track} track
 */

GTAG.prototype.track = function(track, params) {
  var event = track.event() || '';
  if (
    this.customEventsMapping &&
    typeof this.customEventsMapping[event] === 'function'
  ) {
    this.customEventsMapping[event](track);
    return;
  }
  var contextOpts = track.options(this.name);
  var options = this.options;
  var opts = defaults(params || {}, contextOpts);
  var props = track.properties();
  props.event = event;

  var gaOptions = this.options.gaOptions || {};
  if (gaOptions && Object.keys(gaOptions).length) {
    if (gaOptions.setAllMappedProps) {
      // set custom dimension and metrics if present
      // REF: https://developers.google.com/analytics/devguides/collection/gtagjs/custom-dims-mets

      var customMap = merge(gaOptions.dimensions, gaOptions.metrics);
      if (options.gaWebMeasurementId) {
        push('config', this.options.gaWebMeasurementId, {
          custom_map: customMap
        });
      }
      if (options.gaWebAppMeasurementId) {
        push('config', this.options.gaWebAppMeasurementId, {
          custom_map: customMap
        });
      }
    }
  }

  props.non_interaction =
    props.nonInteraction !== undefined
      ? !!props.nonInteraction
      : !!opts.nonInteraction;

  delete props.nonInteraction;

  push('event', props.event, props);
};

/**
 * Page
 *
 * @api public
 * @param {Page} page
 */

GTAG.prototype.page = function(page) {
  var name = page.fullName();
  var category = page.category();
  if (this.options.trackAllPages) {
    this.track(page.track());
  }
  if (name && this.options.trackNamedPages) {
    this.track(page.track(name), { nonInteraction: 1 });
  }
  if (category && this.options.trackCategorizedPages) {
    this.track(page.track(category), { nonInteraction: 1 });
  }
};

/**
 * Page (classic).
 *
 * @param {Page} page
 */

GTAG.prototype.pageClassic = function(page) {
  var name = page.fullName();
  var category = page.category();
  if (this.options.trackAllPages) {
    this.track(page.track());
  }
  if (name && this.options.trackNamedPages) {
    this.track(page.track(name));
  }
  if (category && this.options.trackCategorizedPages) {
    this.track(page.track(category));
  }
};

/**
 * Completed order.
 *
 * @param {Track} track
 */

GTAG.prototype.orderCompletedClassic = function(track) {
  var total = track.total() || track.revenue() || 0;
  var orderId = track.orderId();
  var currency = track.currency();
  var props = track.properties();

  // orderId is required.
  if (!orderId) {
    return;
  }

  push('event', 'purchase', {
    transaction_id: orderId,
    affiliation: props.affiliation,
    value: total,
    currency: currency,
    tax: track.tax(),
    shipping: track.shipping(),
    items: getFormattedProductList(track)
  });
};

/**
 * Product List Viewed - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.productListViewedEnhanced = function(track) {
  push('event', 'view_item_list', {
    items: getFormattedProductList(track)
  });
};

/**
 * Product Clicked - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.productClickedEnhanced = function(track) {
  push('event', 'select_content', {
    content_type: 'product',
    items: [getFormattedProduct(track)]
  });
};

/**
 * Product Viewed - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.productViewedEnhanced = function(track) {
  push('event', 'view_item', {
    items: [getFormattedProduct(track)]
  });
};

/**
 * Product Added - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.productAddedEnhanced = function(track) {
  push('event', 'add_to_cart', {
    items: [getFormattedProduct(track)]
  });
};

/**
 * Product Removed - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.productRemovedEnhanced = function(track) {
  push('event', 'remove_from_cart', {
    items: [getFormattedProduct(track)]
  });
};

/**
 * Promotion Viewed - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.promotionViewedEnhanced = function(track) {
  push('event', 'view_promotion', {
    promotions: [getFormattedPromotion(track)]
  });
};

/**
 * Promotion Clicked - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.promotionClickedEnhanced = function(track) {
  push('event', 'select_content', {
    promotions: [getFormattedPromotion(track)]
  });
};

/**
 * Checkout Started - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.checkoutStartedEnhanced = function(track) {
  var coupon = track.proxy('properties.coupon');

  push('event', 'begin_checkout', {
    value: track.total() || track.revenue() || 0,
    currency: track.currency(),
    items: getFormattedProductList(track),
    coupon: coupon
  });
};

/**
 * Order Updated - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.orderUpdatedEnhanced = function(track) {
  // Same event as started order - will override
  this.checkoutStartedEnhanced(track);
};

/**
 * Checkout Step Viewed - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.checkoutStepViewedEnhanced = function(track) {
  push('event', 'checkout_progress', extractCheckoutOptions(track));
};

/**
 * Checkout Step Completed - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.checkoutStepCompletedEnhanced = function(track) {
  push('event', 'checkout_progress', extractCheckoutOptions(track));
};

/**
 * Order Refunded - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.orderRefundedEnhanced = function(track) {
  var products = track.products();

  var eventData = {
    transaction_id: track.orderId()
  };
  if (products.length) {
    eventData.value = track.total() || track.revenue() || 0;
    eventData.currency = track.currency();
    eventData.tax = track.tax();
    eventData.shipping = track.shipping();
    eventData.affiliation = track.properties().affiliation;
    eventData.items = getFormattedProductList(track);
  }
  push('event', 'refund', eventData);
};

/**
 * Order Completed - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.orderCompletedEnhanced = function(track) {
  var total = track.total() || track.revenue() || 0;
  var orderId = track.orderId();
  var props = track.properties();

  push('event', 'purchase', {
    transaction_id: orderId,
    affiliation: props.affiliation,
    value: total,
    currency: track.currency(),
    tax: track.tax(),
    shipping: track.shipping(),
    items: getFormattedProductList(track)
  });
};

/**
 * Product Added to Wishlist - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.productAddedToWishlistEnhanced = function(track) {
  push('event', 'add_to_wishlist', {
    value: track.price(),
    currency: track.currency(),
    items: [getFormattedProduct(track)]
  });
};

/**
 * Product Shared - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.productSharedEnhanced = function(track) {
  var id = track.productId() || track.id() || track.sku();
  var props = track.properties();
  if (!id) {
    return;
  }
  push('event', 'share', {
    method: props.share_via,
    content_type: track.category(),
    content_id: id
  });
};

/**
 * User Logged In - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.loggedInEnhanced = function(track) {
  var props = track.properties();
  push('event', 'login', { method: props.method });
};

/**
 * User signed Up - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.signedUpEnhanced = function(track) {
  var props = track.properties();
  push('event', 'sign_up', { method: props.method });
};

/**
 * Lead Generated - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.leadGeneratedEnhanced = function(track) {
  push('event', 'generate_lead', {
    transaction_id: track.id(),
    value: track.price(),
    currency: track.currency()
  });
};

/**
 * Exception - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.exceptionOccuredEnhanced = function(track) {
  var props = track.properties();
  push('event', 'exception', {
    description: props.description,
    fatal: props.fatal
  });
};

/**
 * Timing Completed - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.timingCompletedEnhanced = function(track) {
  push('event', 'timing_complete', {
    name: track.name(),
    value: track.value()
  });
};

/**
 * Set Checkout Options - Enhanced Ecommerce
 *
 * @param {Track} track
 */

GTAG.prototype.setCheckoutOptionEnhanced = function(track) {
  var props = track.properties();
  var options = [
    track.proxy('properties.paymentMethod'),
    track.proxy('properties.shippingMethod')
  ];
  push('event', 'set_checkout_option', {
    checkout_step: props.step || 1,
    checkout_option: options.length ? options.join(', ') : null
  });
};

/**
 * Enhanced ecommerce format data for checkout.
 *
 * @api private
 * @param {Track} track
 */
function extractCheckoutOptions(track) {
  var props = track.properties();
  var total = track.total() || track.revenue() || 0;
  var coupon = track.proxy('properties.coupon');
  var options = [
    track.proxy('properties.paymentMethod'),
    track.proxy('properties.shippingMethod')
  ];
  // Remove all nulls, and join with commas.
  options = reject(options);

  return {
    currency: track.currency(),
    checkout_step: props.step || 1,
    value: total,
    items: getFormattedProductList(track),
    coupon: coupon,
    checkout_option: options.length ? options.join(', ') : null
  };
}

/**
 * Enhanced ecommerce format data for promotion.
 *
 *
 * @api private
 * @param {Track} track
 */

function getFormattedPromotion(track) {
  var props = track.properties();
  return {
    id: track.promotionId() || track.id(),
    name: track.name(),
    creative: props.creative,
    position: props.position
  };
}

/**
 * Enhanced ecommerce format data for product.
 *
 *
 * @api private
 * @param {Track} track
 */

function getFormattedProduct(track) {
  var props = track.properties();
  var product = {
    id: track.productId() || track.id() || track.sku(),
    name: track.name(),
    category: track.category(),
    quantity: track.quantity(),
    price: track.price(),
    brand: props.brand,
    variant: props.variant,
    currency: track.currency()
  };

  // https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#product-data
  // GA requires an integer but our specs says "Number", so it could be a float.
  if (props.position != null) {
    product.position = Math.round(props.position);
  }

  // append coupon if it set
  // https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#measuring-transactions
  var coupon = track.proxy('properties.coupon');
  if (coupon) product.coupon = coupon;

  return product;
}

function getFormattedProductList(track) {
  var productList = [];
  var products = track.products();
  var props = track.properties();

  for (var i = 0; i < products.length; i++) {
    var product = new Track({ properties: products[i] });
    var productId = product.id() || product.productId() || product.sku();
    if (productId) {
      productList.push({
        id: productId,
        name: product.name(),
        category: product.category() || track.category(),
        list_name: props.list_id || track.category() || 'products',
        brand: product.properties().brand,
        variant: product.properties().variant,
        quantity: product.quantity(),
        price: product.price(),
        list_position: getProductPosition(product, products)
      });
    }
  }
  return productList;
}

function getProductPosition(item, products) {
  var position = item.properties().position;
  if (
    typeof position !== 'undefined' &&
    !Number.isNaN(Number(position)) &&
    Number(position) > -1
  ) {
    // If position passed and is valid positive number.
    return Number(position);
  }
  var productIds = products
    .map(function(x) {
      return x.product_id;
    })
    .filter(Boolean);
  if (productIds.length === 0) {
    productIds = products.map(function(x) {
      return x.sku;
    });
    return productIds.indexOf(item.sku()) + 1;
  }
  return productIds.indexOf(item.productId()) + 1;
}

/**
 * Merge two javascript objects. This works similarly to `Object.assign({}, obj1, obj2)`
 * but it's compatible with old browsers. The properties of the first argument takes preference
 * over the other.
 *
 * It does not do fancy stuff, just use it with top level properties.
 *
 * @param {Object} obj1 Object 1
 * @param {Object} obj2 Object 2
 *
 * @return {Object} a new object with all the properties of obj1 and the remainder of obj2.
 */
function merge(obj1, obj2) {
  var res = {};

  // All properties of obj1
  for (var propObj1 in obj1) {
    if (obj1.hasOwnProperty(propObj1)) {
      res[propObj1] = obj1[propObj1];
    }
  }

  // Extra properties of obj2
  for (var propObj2 in obj2) {
    if (obj2.hasOwnProperty(propObj2) && !res.hasOwnProperty(propObj2)) {
      res[propObj2] = obj2[propObj2];
    }
  }

  return res;
}

// Exposed only for testing
GTAG.merge = merge;