'use strict';
const fs = require('fs-extra');
const path = require('path');
const configPath = process.cwd() + '/padplus.config.json';
const htmlTemplatePath = path.join(__dirname, '../templates/public') + '/index.html';
const hbsfy = require('hbsfy');
const browserifycss = require('browserify-css');
const colors = require('colors');
const cheerio = require('cheerio');
const minify = require('html-minifier').minify;
var bundleFiles = [], $, html, config;

colors.setTheme({
  silly: 'rainbow',
  info: 'cyan',
  prompt: 'white',
  data: 'grey',
  error: 'red',
});

var handleBundle = function (plugin, index) {
  if (plugin.indexOf('/') > -1)
    plugin = plugin.split('/')[1];
  else if (plugin.indexOf('padplus-plugin') == -1 && plugin.indexOf('/') == -1)
    plugin = 'padplus-plugin-'.concat(plugin);

  var currentPlugin = require(process.cwd() + '/node_modules/' + plugin);

  /* JUST SO I DON'T BREAK ANY OLD PLUGINS, WILL BE REMOVED ON THE 31.03.2016 */
  if (typeof currentPlugin.modifyHtml != 'undefined') {
    var modified = currentPlugin.modifyHtml($, config);
    if (typeof modified != 'undefined') {
      $ = modified;
    }
  }
  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -*/

  if (typeof currentPlugin.func != 'undefined') {
    var modified = currentPlugin.func({
      $: $,
      config: config,
    });

    if (typeof modified.$ != 'undefined') {
      $ = modified.$;
    }

    if (typeof modified.config != 'undefined') {
      config = modified.config;
    }
  }

  if (typeof currentPlugin.clientJs != 'undefined')
    bundleFiles.push(currentPlugin.clientJs);

  if (index == config.plugins.length - 1) {
    $('*').each(function (i, elem) {
      $(this).attr('extend', '');
    });

    var html = minify($.html(), {
      removeAttributeQuotes: true,
      removeComments: true,
      collapseWhitespace: true,
      removeTagWhitespace: true,
    });
    fs.outputFileSync(process.cwd() + '/webserver/public/index.html', html.replace(/ extend=extend/g, ''));

    fs.outputJsonSync(configPath, config);
    console.log('Bundled HTML');
    bundle();
  }
};

var bundle = function () {
  console.log('Now Bundeling client js files'.info);
  var browserify = require('browserify');
  var b = browserify({
    transform: [hbsfy, browserifycss],
    entries: bundleFiles,
    paths: ['./', process.cwd()],
    browserField: false,
  });

  b.bundle(function (err, buffer) {
    if (err)
      console.log(err);
    var js = buffer.toString('utf-8');
    fs.outputFileSync(process.cwd() + '/webserver/public/lib/js/padplus.js', js);
    console.log('Bundleing complete!'.info);
  });
};

module.exports = function () {
  config = fs.readJsonSync(configPath);
  console.log(configPath);
  html = fs.readFileSync(htmlTemplatePath, 'utf8');
  $ = cheerio.load(html);
  config.plugins.forEach(handleBundle);
};
