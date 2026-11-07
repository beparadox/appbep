/*
 * RequireJS configuration (restored 2026). The original loaded jQuery, Handlebars and
 * Bootstrap from CDNs with local fallbacks; these are the same versions, served locally.
 */
requirejs.config({
  baseUrl: 'js',
  paths: {
    jquery: 'vendor/jquery',
    handlebars: 'vendor/handlebars',
    bootstrap: 'vendor/bootstrap',
  },
  shim: {
    handlebars: { exports: 'Handlebars' },
    bootstrap: { deps: ['jquery'], exports: 'bootstrap' },
  },
});

requirejs(['app/controller']);
