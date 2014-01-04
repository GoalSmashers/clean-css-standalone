#!/usr/bin/env node

var util = require('util');
var fs = require('fs');
var path = require('path');

var options = {
  source: null,
  target: null
};
var cleanOptions = {};
var fromStdin = !process.env['__DIRECT__'] && !process.stdin.isTTY;
var version = '2.0.5';

// Arguments parsing (to drop optimist dependency)
var argv = process.argv.slice(2);
argv.has = function(option) {
  return this.indexOf(option) > -1;
};
(function() {
  var optionMatch = /^\-\-?\w/;
  for (var i = 0, l = argv.length; i < l; i++) {
    if (!optionMatch.test(argv[i])) {
      var isNotAfterOption = i > 0 && (!optionMatch.test(argv[i - 1]) || i == l - 1);
      var isOnlyArgument = i == 0 && l == 1;
      if (isNotAfterOption || isOnlyArgument) {
        argv._ = argv.slice(i);
        break;
      }
    }
  }
})();

if (argv.has('-o'))
  cleanOptions.target = options.target = argv[argv.indexOf('-o') + 1];
if (argv.has('-b'))
  cleanOptions.keepBreaks = true;
if (argv.has('--s1'))
  cleanOptions.keepSpecialComments = 1;
if (argv.has('--s0'))
  cleanOptions.keepSpecialComments = 0;
if (argv.has('-s'))
  cleanOptions.processImport = false;
if (argv.has('--skip-rebase'))
  cleanOptions.noRebase = true;
if (argv.has('--skip-advanced'))
  cleanOptions.noAdvanced = true;
if (argv.has('--selectors-merge-mode'))
  cleanOptions.selectorsMergeMode = argv[argv.indexOf('--selectors-merge-mode') + 1];
if (argv.has('-d'))
  cleanOptions.debug = true;
if (argv.has('-r'))
  cleanOptions.root = argv[argv.indexOf('-r') + 1]
if (argv._ && !fromStdin) {
  options.source = argv._[0];
  cleanOptions.relativeTo = path.dirname(path.resolve(options.source));
}

if (argv.has('-v')) {
  util.puts(version);
  process.exit(0);
}

if (argv.has('-h') || argv.has('--help') || (!fromStdin && !argv._)) {
  util.puts('usage: node clean-css.js [options] -o <output-file> <input-file>\n');
  util.puts('options:');
  util.puts('  -e\t\t\t\t\tRemove empty declarations (e.g. a{})');
  util.puts('  -b\t\t\t\t\tKeep line breaks');
  util.puts('  --s0\t\t\t\t\tRemove all special comments (i.e. /*! special comment */)');
  util.puts('  --s1\t\t\t\t\tRemove all special comments but the first one');
  util.puts('  -s\t\t\t\t\tDisable the @import processing');
  util.puts('  --skip-rebase\t\t\tDisable advanced processing');
  util.puts('  --skip-advanced\t\t\tDisable advanced processing');
  util.puts('  --selectors-merge-mode [ie8|*]\tEither IE8 compatible or ful selectors merging');
  util.puts('  -r\t\t\t\t\tSet a root path to which resolve absolute @import rules');
  util.puts('  -d\t\t\t\t\tShow debug information (minification time & compression efficiency)');
  process.exit(0);
}

// If we got here then there's some serious work to do
if (options.source) {
  fs.readFile(options.source, 'utf8', function(error, data) {
    if (error)
      throw error;
    output(minify(data));
  });
} else {
  var stdin = process.openStdin();
  stdin.setEncoding('utf-8');
  var data = '';
  stdin.on('data', function(chunk) {
    data += chunk;
  });
  stdin.on('end', function() {
    output(minify(data));
  });
}

function minify(data) {
  var minifier = new CleanCSS(cleanOptions);
  var minified = minifier.minify(data);

  if (cleanOptions.debug) {
    console.error('Original: %d bytes', minifier.stats.originalSize);
    console.error('Minified: %d bytes', minifier.stats.minifiedSize);
    console.error('Efficiency: %d%', ~~(minifier.stats.efficiency * 10000) / 100.0);
    console.error('Time spent: %dms', minifier.stats.timeSpent);
  }

  outputFeedback(minifier.errors, true);
  outputFeedback(minifier.warnings);

  if (minifier.errors.length > 0)
    process.exit(1);

  return minified;
}

function output(minified) {
  if (options.target)
    fs.writeFileSync(options.target, minified, 'utf8');
  else
    process.stdout.write(minified);
};

function outputFeedback(messages, isError) {
  var prefix = isError ? '\x1B[31mERROR\x1B[39m:' : 'WARNING:';

  messages.forEach(function(message) {
    console.error('%s %s', prefix, message);
  });
};

// lib/colors/*

function ColorHSLToHex(data) {
  // HSL to RGB converter. Both methods adapted from:
  // http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
  var hslToRgb = function(h, s, l) {
    var r, g, b;

    // normalize hue orientation b/w 0 and 360 degrees
    h = h % 360;
    if (h < 0)
      h += 360;
    h = ~~h / 360;

    if (s < 0)
      s = 0;
    else if (s > 100)
      s = 100;
    s = ~~s / 100;

    if (l < 0)
      l = 0;
    else if (l > 100)
      l = 100;
    l = ~~l / 100;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      var q = l < 0.5 ?
        l * (1 + s) :
        l + s - l * s;
      var p = 2 * l - q;
      r = hueToRgb(p, q, h + 1/3);
      g = hueToRgb(p, q, h);
      b = hueToRgb(p, q, h - 1/3);
    }

    return [~~(r * 255), ~~(g * 255), ~~(b * 255)];
  };

  var hueToRgb = function(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  return {
    process: function() {
      return data.replace(/hsl\((-?\d+),(-?\d+)%?,(-?\d+)%?\)/g, function(match, hue, saturation, lightness) {
        var asRgb = hslToRgb(hue, saturation, lightness);
        var redAsHex = asRgb[0].toString(16);
        var greenAsHex = asRgb[1].toString(16);
        var blueAsHex = asRgb[2].toString(16);

        return '#' +
          ((redAsHex.length == 1 ? '0' : '') + redAsHex) +
          ((greenAsHex.length == 1 ? '0' : '') + greenAsHex) +
          ((blueAsHex.length == 1 ? '0' : '') + blueAsHex);
      });
    }
  };
};

function ColorLongToShortHex(data) {
  return {
    process: function() {
      return data.replace(/([,: \(])#([0-9a-f]{6})/gi, function(match, prefix, color) {
        if (color[0] == color[1] && color[2] == color[3] && color[4] == color[5])
          return prefix + '#' + color[0] + color[2] + color[4];
        else
          return prefix + '#' + color;
      });
    }
  };
};

function ColorRGBToHex(data) {
  return {
    process: function() {
      return data.replace(/rgb\((\d+),(\d+),(\d+)\)/g, function(match, red, green, blue) {
        var redAsHex = parseInt(red, 10).toString(16);
        var greenAsHex = parseInt(green, 10).toString(16);
        var blueAsHex = parseInt(blue, 10).toString(16);

        return '#' +
          ((redAsHex.length == 1 ? '0' : '') + redAsHex) +
          ((greenAsHex.length == 1 ? '0' : '') + greenAsHex) +
          ((blueAsHex.length == 1 ? '0' : '') + blueAsHex);
      });
    }
  };
};

function ColorShortener(data) {
  var COLORS = {
    aliceblue: '#f0f8ff',
    antiquewhite: '#faebd7',
    aqua: '#0ff',
    aquamarine: '#7fffd4',
    azure: '#f0ffff',
    beige: '#f5f5dc',
    bisque: '#ffe4c4',
    black: '#000',
    blanchedalmond: '#ffebcd',
    blue: '#00f',
    blueviolet: '#8a2be2',
    brown: '#a52a2a',
    burlywood: '#deb887',
    cadetblue: '#5f9ea0',
    chartreuse: '#7fff00',
    chocolate: '#d2691e',
    coral: '#ff7f50',
    cornflowerblue: '#6495ed',
    cornsilk: '#fff8dc',
    crimson: '#dc143c',
    cyan: '#0ff',
    darkblue: '#00008b',
    darkcyan: '#008b8b',
    darkgoldenrod: '#b8860b',
    darkgray: '#a9a9a9',
    darkgreen: '#006400',
    darkkhaki: '#bdb76b',
    darkmagenta: '#8b008b',
    darkolivegreen: '#556b2f',
    darkorange: '#ff8c00',
    darkorchid: '#9932cc',
    darkred: '#8b0000',
    darksalmon: '#e9967a',
    darkseagreen: '#8fbc8f',
    darkslateblue: '#483d8b',
    darkslategray: '#2f4f4f',
    darkturquoise: '#00ced1',
    darkviolet: '#9400d3',
    deeppink: '#ff1493',
    deepskyblue: '#00bfff',
    dimgray: '#696969',
    dodgerblue: '#1e90ff',
    firebrick: '#b22222',
    floralwhite: '#fffaf0',
    forestgreen: '#228b22',
    fuchsia: '#f0f',
    gainsboro: '#dcdcdc',
    ghostwhite: '#f8f8ff',
    gold: '#ffd700',
    goldenrod: '#daa520',
    gray: '#808080',
    green: '#008000',
    greenyellow: '#adff2f',
    honeydew: '#f0fff0',
    hotpink: '#ff69b4',
    indianred: '#cd5c5c',
    indigo: '#4b0082',
    ivory: '#fffff0',
    khaki: '#f0e68c',
    lavender: '#e6e6fa',
    lavenderblush: '#fff0f5',
    lawngreen: '#7cfc00',
    lemonchiffon: '#fffacd',
    lightblue: '#add8e6',
    lightcoral: '#f08080',
    lightcyan: '#e0ffff',
    lightgoldenrodyellow: '#fafad2',
    lightgray: '#d3d3d3',
    lightgreen: '#90ee90',
    lightpink: '#ffb6c1',
    lightsalmon: '#ffa07a',
    lightseagreen: '#20b2aa',
    lightskyblue: '#87cefa',
    lightslategray: '#778899',
    lightsteelblue: '#b0c4de',
    lightyellow: '#ffffe0',
    lime: '#0f0',
    limegreen: '#32cd32',
    linen: '#faf0e6',
    magenta: '#ff00ff',
    maroon: '#800000',
    mediumaquamarine: '#66cdaa',
    mediumblue: '#0000cd',
    mediumorchid: '#ba55d3',
    mediumpurple: '#9370db',
    mediumseagreen: '#3cb371',
    mediumslateblue: '#7b68ee',
    mediumspringgreen: '#00fa9a',
    mediumturquoise: '#48d1cc',
    mediumvioletred: '#c71585',
    midnightblue: '#191970',
    mintcream: '#f5fffa',
    mistyrose: '#ffe4e1',
    moccasin: '#ffe4b5',
    navajowhite: '#ffdead',
    navy: '#000080',
    oldlace: '#fdf5e6',
    olive: '#808000',
    olivedrab: '#6b8e23',
    orange: '#ffa500',
    orangered: '#ff4500',
    orchid: '#da70d6',
    palegoldenrod: '#eee8aa',
    palegreen: '#98fb98',
    paleturquoise: '#afeeee',
    palevioletred: '#db7093',
    papayawhip: '#ffefd5',
    peachpuff: '#ffdab9',
    peru: '#cd853f',
    pink: '#ffc0cb',
    plum: '#dda0dd',
    powderblue: '#b0e0e6',
    purple: '#800080',
    red: '#f00',
    rosybrown: '#bc8f8f',
    royalblue: '#4169e1',
    saddlebrown: '#8b4513',
    salmon: '#fa8072',
    sandybrown: '#f4a460',
    seagreen: '#2e8b57',
    seashell: '#fff5ee',
    sienna: '#a0522d',
    silver: '#c0c0c0',
    skyblue: '#87ceeb',
    slateblue: '#6a5acd',
    slategray: '#708090',
    snow: '#fffafa',
    springgreen: '#00ff7f',
    steelblue: '#4682b4',
    tan: '#d2b48c',
    teal: '#008080',
    thistle: '#d8bfd8',
    tomato: '#ff6347',
    turquoise: '#40e0d0',
    violet: '#ee82ee',
    wheat: '#f5deb3',
    white: '#fff',
    whitesmoke: '#f5f5f5',
    yellow: '#ff0',
    yellowgreen: '#9acd32'
  };

  var toHex = {};
  var toName = {};

  for (var name in COLORS) {
    var color = COLORS[name];
    if (name.length < color.length)
      toName[color] = name;
    else
      toHex[name] = color;
  }

  return {
    toHex: toHex,
    toName: toName,

    // replace color name with hex values if shorter (or the other way around)
    process: function() {
      [toHex, toName].forEach(function(conversion) {
        var pattern = '(' + Object.keys(conversion).join('|') + ')';
        var colorSwitcher = function(match, prefix, colorValue, suffix) {
          return prefix + conversion[colorValue.toLowerCase()] + suffix;
        };
        data = data.replace(new RegExp('([ :,\\(])' + pattern + '([;\\}!\\) ])', 'ig'), colorSwitcher);
        data = data.replace(new RegExp('(,)' + pattern + '(,)', 'ig'), colorSwitcher);
      });

      return data;
    }
  };
};

// lib/images/*

function UrlRebase(options, context) {
  var process = function(data) {
    var rebaseOpts = {
      absolute: !!options.root,
      relative: !options.root && !!options.target,
      fromBase: options.relativeTo
    };

    if (!rebaseOpts.absolute && !rebaseOpts.relative)
      return data;

    if (rebaseOpts.absolute && !!options.target)
      context.warnings.push('Both \'root\' and output file given so rebasing URLs as absolute paths');

    if (rebaseOpts.absolute)
      rebaseOpts.toBase = path.resolve(options.root);

    if (rebaseOpts.relative)
      rebaseOpts.toBase = path.resolve(path.dirname(options.target));

    if (!rebaseOpts.fromBase || !rebaseOpts.toBase)
      return data;

    return UrlRewriter.process(data, rebaseOpts);
  };

  return {
    process: process
  };
};

var UrlRewriter = {
  process: function(data, options) {
    var tempData = [];
    var nextStart = 0;
    var nextEnd = 0;
    var cursor = 0;

    for (; nextEnd < data.length; ) {
      nextStart = data.indexOf('url(', nextEnd);
      if (nextStart == -1)
        break;

      nextEnd = data.indexOf(')', nextStart + 4);
      if (nextEnd == -1)
        break;

      tempData.push(data.substring(cursor, nextStart));
      var url = data.substring(nextStart + 4, nextEnd).replace(/['"]/g, '');
      tempData.push('url(' + this._rebased(url, options) + ')');
      cursor = nextEnd + 1;
    }

    return tempData.length > 0 ?
      tempData.join('') + data.substring(cursor, data.length) :
      data;
  },

  _rebased: function(url, options) {
    var specialUrl = url[0] == '/' ||
      url.substring(url.length - 4) == '.css' ||
      url.indexOf('data:') === 0 ||
      /^https?:\/\//.exec(url) !== null ||
      /__\w+__/.exec(url) !== null;
    var rebased;

    if (specialUrl)
      return url;

    if (options.absolute) {
      rebased = path
        .resolve(path.join(options.fromBase, url))
        .replace(options.toBase, '');
    } else {
      rebased = path.relative(options.toBase, path.join(options.fromBase, url));
    }

    return process.platform == 'win32' ?
      rebased.replace(/\\/g, '/') :
      rebased;
  }
};

// lib/imports/*

function ImportInliner(context) {
  var process = function(data, options) {
    var tempData = [];
    var nextStart = 0;
    var nextEnd = 0;
    var cursor = 0;
    var isComment = commentScanner(data);

    options.relativeTo = options.relativeTo || options.root;
    options._baseRelativeTo = options._baseRelativeTo || options.relativeTo;
    options.visited = options.visited || [];

    for (; nextEnd < data.length; ) {
      nextStart = data.indexOf('@import', cursor);
      if (nextStart == -1)
        break;

      if (isComment(nextStart)) {
        cursor = nextStart + 1;
        continue;
      }

      nextEnd = data.indexOf(';', nextStart);
      if (nextEnd == -1)
        break;

      tempData.push(data.substring(cursor, nextStart));
      tempData.push(inlinedFile(data, nextStart, nextEnd, options));
      cursor = nextEnd + 1;
    }

    return tempData.length > 0 ?
      tempData.join('') + data.substring(cursor, data.length) :
      data;
  };

  var commentScanner = function(data) {
    var commentRegex = /(\/\*(?!\*\/)[\s\S]*?\*\/)/;
    var lastEndIndex = 0;
    var noComments = false;

    // test whether an index is located within a comment
    var scanner = function(idx) {
      var comment;
      var localStartIndex = 0;
      var localEndIndex = 0;
      var globalStartIndex = 0;
      var globalEndIndex = 0;

      // return if we know there are no more comments
      if (noComments)
        return false;

      // idx can be still within last matched comment (many @import statements inside one comment)
      if (idx < lastEndIndex)
        return true;

      comment = data.match(commentRegex);

      if (!comment) {
        noComments = true;
        return false;
      }

      // get the indexes relative to the current data chunk
      localStartIndex = comment.index;
      localEndIndex = localStartIndex + comment[0].length;

      // calculate the indexes relative to the full original data
      globalEndIndex = localEndIndex + lastEndIndex;
      globalStartIndex = globalEndIndex - comment[0].length;

      // chop off data up to and including current comment block
      data = data.substring(localEndIndex);
      lastEndIndex = globalEndIndex;

      // re-run scan if comment ended before the idx
      if (globalEndIndex < idx)
        return scanner(idx);

      return globalEndIndex > idx && idx > globalStartIndex;
    };

    return scanner;
  };

  var inlinedFile = function(data, nextStart, nextEnd, options) {
    var strippedImport = data
      .substring(data.indexOf(' ', nextStart) + 1, nextEnd)
      .replace(/^url\(/, '')
      .replace(/['"]/g, '');

    var separatorIndex = strippedImport.indexOf(' ');
    var importedFile = strippedImport
      .substring(0, separatorIndex > 0 ? separatorIndex : strippedImport.length)
      .replace(')', '');
    var mediaQuery = strippedImport
      .substring(importedFile.length + 1)
      .trim();

    if (/^(http|https):\/\//.test(importedFile) || /^\/\//.test(importedFile))
      return '@import url(' + importedFile + ')' + (mediaQuery.length > 0 ? ' ' + mediaQuery : '') + ';';

    var relativeTo = importedFile[0] == '/' ?
      options.root :
      options.relativeTo;

    var fullPath = path.resolve(path.join(relativeTo, importedFile));

    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      context.errors.push('Broken @import declaration of "' + importedFile + '"');
      return '';
    }

    if (options.visited.indexOf(fullPath) != -1)
      return '';

    options.visited.push(fullPath);

    var importedData = fs.readFileSync(fullPath, 'utf8');
    var importRelativeTo = path.dirname(fullPath);
    importedData = UrlRewriter.process(importedData, {
      relative: true,
      fromBase: importRelativeTo,
      toBase: options._baseRelativeTo
    });

    var inlinedData = process(importedData, {
      root: options.root,
      relativeTo: importRelativeTo,
      _baseRelativeTo: options.baseRelativeTo,
      visited: options.visited
    });
    return mediaQuery.length > 0 ?
      '@media ' + mediaQuery + '{' + inlinedData + '}' :
      inlinedData;
  };

  return {
    // Inlines all imports taking care of repetitions, unknown files, and circular dependencies
    process: process
  };
};

// lib/properties/*

function PropertyOptimizer() {
  var overridable = {
    'animation-delay': ['animation'],
    'animation-direction': ['animation'],
    'animation-duration': ['animation'],
    'animation-fill-mode': ['animation'],
    'animation-iteration-count': ['animation'],
    'animation-name': ['animation'],
    'animation-play-state': ['animation'],
    'animation-timing-function': ['animation'],
    '-moz-animation-delay': ['-moz-animation'],
    '-moz-animation-direction': ['-moz-animation'],
    '-moz-animation-duration': ['-moz-animation'],
    '-moz-animation-fill-mode': ['-moz-animation'],
    '-moz-animation-iteration-count': ['-moz-animation'],
    '-moz-animation-name': ['-moz-animation'],
    '-moz-animation-play-state': ['-moz-animation'],
    '-moz-animation-timing-function': ['-moz-animation'],
    '-o-animation-delay': ['-o-animation'],
    '-o-animation-direction': ['-o-animation'],
    '-o-animation-duration': ['-o-animation'],
    '-o-animation-fill-mode': ['-o-animation'],
    '-o-animation-iteration-count': ['-o-animation'],
    '-o-animation-name': ['-o-animation'],
    '-o-animation-play-state': ['-o-animation'],
    '-o-animation-timing-function': ['-o-animation'],
    '-webkit-animation-delay': ['-webkit-animation'],
    '-webkit-animation-direction': ['-webkit-animation'],
    '-webkit-animation-duration': ['-webkit-animation'],
    '-webkit-animation-fill-mode': ['-webkit-animation'],
    '-webkit-animation-iteration-count': ['-webkit-animation'],
    '-webkit-animation-name': ['-webkit-animation'],
    '-webkit-animation-play-state': ['-webkit-animation'],
    '-webkit-animation-timing-function': ['-webkit-animation'],
    'background-attachment': ['background'],
    'background-clip': ['background'],
    'background-color': ['background'],
    'background-image': ['background'],
    'background-origin': ['background'],
    'background-position': ['background'],
    'background-repeat': ['background'],
    'background-size': ['background'],
    'border-color': ['border'],
    'border-style': ['border'],
    'border-width': ['border'],
    'border-bottom': ['border'],
    'border-bottom-color': ['border-bottom', 'border-color', 'border'],
    'border-bottom-style': ['border-bottom', 'border-style', 'border'],
    'border-bottom-width': ['border-bottom', 'border-width', 'border'],
    'border-left': ['border'],
    'border-left-color': ['border-left', 'border-color', 'border'],
    'border-left-style': ['border-left', 'border-style', 'border'],
    'border-left-width': ['border-left', 'border-width', 'border'],
    'border-right': ['border'],
    'border-right-color': ['border-right', 'border-color', 'border'],
    'border-right-style': ['border-right', 'border-style', 'border'],
    'border-right-width': ['border-right', 'border-width', 'border'],
    'border-top': ['border'],
    'border-top-color': ['border-top', 'border-color', 'border'],
    'border-top-style': ['border-top', 'border-style', 'border'],
    'border-top-width': ['border-top', 'border-width', 'border'],
    'font-family': ['font'],
    'font-size': ['font'],
    'font-style': ['font'],
    'font-variant': ['font'],
    'font-weight': ['font'],
    'list-style-image': ['list'],
    'list-style-position': ['list'],
    'list-style-type': ['list'],
    'margin-bottom': ['margin'],
    'margin-left': ['margin'],
    'margin-right': ['margin'],
    'margin-top': ['margin'],
    'outline-color': ['outline'],
    'outline-style': ['outline'],
    'outline-width': ['outline'],
    'padding-bottom': ['padding'],
    'padding-left': ['padding'],
    'padding-right': ['padding'],
    'padding-top': ['padding'],
    'transition-delay': ['transition'],
    'transition-duration': ['transition'],
    'transition-property': ['transition'],
    'transition-timing-function': ['transition'],
    '-moz-transition-delay': ['-moz-transition'],
    '-moz-transition-duration': ['-moz-transition'],
    '-moz-transition-property': ['-moz-transition'],
    '-moz-transition-timing-function': ['-moz-transition'],
    '-o-transition-delay': ['-o-transition'],
    '-o-transition-duration': ['-o-transition'],
    '-o-transition-property': ['-o-transition'],
    '-o-transition-timing-function': ['-o-transition'],
    '-webkit-transition-delay': ['-webkit-transition'],
    '-webkit-transition-duration': ['-webkit-transition'],
    '-webkit-transition-property': ['-webkit-transition'],
    '-webkit-transition-timing-function': ['-webkit-transition']
  };

  var overrides = {};
  for (var granular in overridable) {
    for (var i = 0; i < overridable[granular].length; i++) {
      var coarse = overridable[granular][i];
      var list = overrides[coarse];

      if (list)
        list.push(granular);
      else
        overrides[coarse] = [granular];
    }
  }

  var tokenize = function(body) {
    var tokens = body.split(';');
    var keyValues = [];

    for (var i = 0, l = tokens.length; i < l; i++) {
      var token = tokens[i];
      if (token === '')
        continue;

      var firstColon = token.indexOf(':');
      keyValues.push([
        token.substring(0, firstColon),
        token.substring(firstColon + 1),
        token.indexOf('!important') > -1
      ]);
    }

    return keyValues;
  };

  var optimize = function(tokens, allowAdjacent) {
    var merged = [];
    var properties = [];
    var lastProperty = null;
    var rescanTrigger = {};

    var removeOverridenBy = function(property, isImportant) {
      var overrided = overrides[property];
      for (var i = 0, l = overrided.length; i < l; i++) {
        for (var j = 0; j < properties.length; j++) {
          if (properties[j] != overrided[i] || (merged[j][2] && !isImportant))
            continue;

          merged.splice(j, 1);
          properties.splice(j, 1);
          j -= 1;
        }
      }
    };

    var mergeablePosition = function(position) {
      if (allowAdjacent === false || allowAdjacent === true)
        return allowAdjacent;

      return allowAdjacent.indexOf(position) > -1;
    };

    tokensLoop:
    for (var i = 0, l = tokens.length; i < l; i++) {
      var token = tokens[i];
      var property = token[0];
      var isImportant = token[2];
      var _property = (property == '-ms-filter' || property == 'filter') ?
        (lastProperty == 'background' || lastProperty == 'background-image' ? lastProperty : property) :
        property;
      var toOverridePosition = 0;

      // comment is necessary - we assume that if two properties are one after another
      // then it is intentional way of redefining property which may not be widely supported
      // e.g. a{display:inline-block;display:-moz-inline-box}
      // however if `mergeablePosition` yields true then the rule does not apply
      // (e.g merging two adjacent selectors: `a{display:block}a{display:block}`)
      if (_property != lastProperty || mergeablePosition(i)) {
        while (true) {
          toOverridePosition = properties.indexOf(_property, toOverridePosition);
          if (toOverridePosition == -1)
            break;

          if (merged[toOverridePosition][2] && !isImportant)
            continue tokensLoop;

          merged.splice(toOverridePosition, 1);
          properties.splice(toOverridePosition, 1);
        }
      }

      merged.push(token);
      properties.push(_property);

      // certain properties (see values of `overridable`) should trigger removal of
      // more granular properties (see keys of `overridable`)
      if (rescanTrigger[_property])
        removeOverridenBy(_property, isImportant);

      // add rescan triggers - if certain property appears later in the list a rescan needs
      // to be triggered, e.g 'border-top' triggers a rescan after 'border-top-width' and
      // 'border-top-color' as they can be removed
      for (var j = 0, list = overridable[_property] || [], m = list.length; j < m; j++)
        rescanTrigger[list[j]] = true;

      lastProperty = _property;
    }

    return merged;
  };

  var rebuild = function(tokens) {
    var flat = [];

    for (var i = 0, l = tokens.length; i < l; i++) {
      flat.push(tokens[i][0] + ':' + tokens[i][1]);
    }

    return flat.join(';');
  };

  return {
    process: function(body, allowAdjacent) {
      var tokens = tokenize(body);
      if (tokens.length < 2)
        return body;

      var optimized = optimize(tokens, allowAdjacent);
      return rebuild(optimized);
    }
  };
};

function ShorthandNotations(data) {
  // shorthand notations
  var shorthandRegex = function(repeats, hasSuffix) {
    var pattern = '(padding|margin|border\\-width|border\\-color|border\\-style|border\\-radius):';
    for (var i = 0; i < repeats; i++)
      pattern += '([\\d\\w\\.%#\\(\\),]+)' + (i < repeats - 1 ? ' ' : '');
    return new RegExp(pattern + (hasSuffix ? '([;}])' : ''), 'g');
  };

  var from4Values = function() {
    return data.replace(shorthandRegex(4), function(match, property, size1, size2, size3, size4) {
      if (size1 === size2 && size1 === size3 && size1 === size4)
        return property + ':' + size1;
      else if (size1 === size3 && size2 === size4)
        return property + ':' + size1 + ' ' + size2;
      else if (size2 === size4)
        return property + ':' + size1 + ' ' + size2 + ' ' + size3;
      else
        return match;
    });
  };

  var from3Values = function() {
    return data.replace(shorthandRegex(3, true), function(match, property, size1, size2, size3, suffix) {
      if (size1 === size2 && size1 === size3)
        return property + ':' + size1 + suffix;
      else if (size1 === size3)
        return property + ':' + size1 + ' ' + size2 + suffix;
      else
        return match;
    });
  };

  var from2Values = function() {
    return data.replace(shorthandRegex(2, true), function(match, property, size1, size2, suffix) {
      if (size1 === size2)
        return property + ':' + size1 + suffix;
      else
        return match;
    });
  };

  return {
    process: function() {
      data = from4Values();
      data = from3Values();
      return from2Values();
    }
  };
};

// lib/selectors/*

function EmptyRemoval(data) {
  var stripEmpty = function(cssData) {
    var tempData = [];
    var nextEmpty = 0;
    var cursor = 0;

    for (; nextEmpty < cssData.length; ) {
      nextEmpty = cssData.indexOf('{}', cursor);
      if (nextEmpty == -1)
        break;

      var startsAt = nextEmpty - 1;
      while (cssData[startsAt] && cssData[startsAt] != '}' && cssData[startsAt] != '{')
        startsAt--;

      tempData.push(cssData.substring(cursor, startsAt + 1));
      cursor = nextEmpty + 2;
    }

    return tempData.length > 0 ?
      stripEmpty(tempData.join('') + cssData.substring(cursor, cssData.length)) :
      cssData;
  };

  return {
    process: function() {
      return stripEmpty(data);
    }
  };
};

function SelectorsOptimizer(data, context, options) {
  var specialSelectors = {
    '*': /\-(moz|ms|o|webkit)\-/,
    'ie8': /(\-moz\-|\-ms\-|\-o\-|\-webkit\-|:not|:target|:visited|:empty|:first\-of|:last|:nth|:only|:root)/
  };

  var propertyOptimizer = new PropertyOptimizer();

  var cleanUpSelector = function(selectors) {
    var plain = [];
    selectors = selectors.split(',');

    for (var i = 0, l = selectors.length; i < l; i++) {
      var sel = selectors[i];

      if (plain.indexOf(sel) == -1)
        plain.push(sel);
    }

    return plain.sort().join(',');
  };

  var isSpecial = function(selector) {
    return specialSelectors[options.selectorsMergeMode || '*'].test(selector);
  };

  var removeDuplicates = function(tokens) {
    var matched = {};
    var forRemoval = [];

    for (var i = 0, l = tokens.length; i < l; i++) {
      if (typeof(tokens[i]) == 'string' || tokens[i].block)
        continue;

      var selector = tokens[i].selector;
      var body = tokens[i].body;
      var id = body + '@' + selector;
      var alreadyMatched = matched[id];

      if (alreadyMatched) {
        forRemoval.push(alreadyMatched[alreadyMatched.length - 1]);
        alreadyMatched.push(i);
      } else {
        matched[id] = [i];
      }
    }

    forRemoval = forRemoval.sort(function(a, b) { return a > b ? 1 : -1; });
    for (var j = 0, n = forRemoval.length; j < n; j++) {
      tokens.splice(forRemoval[j] - j, 1);
    }
  };

  var mergeAdjacent = function(tokens) {
    var forRemoval = [];
    var lastToken = { selector: null, body: null };

    for (var i = 0, l = tokens.length; i < l; i++) {
      var token = tokens[i];

      if (typeof(token) == 'string' || token.block)
        continue;

      if (token.selector == lastToken.selector) {
        var joinAt = [lastToken.body.split(';').length];
        lastToken.body = propertyOptimizer.process(lastToken.body + ';' + token.body, joinAt);
        forRemoval.push(i);
      } else if (token.body == lastToken.body && !isSpecial(token.selector) && !isSpecial(lastToken.selector)) {
        lastToken.selector = cleanUpSelector(lastToken.selector + ',' + token.selector);
        forRemoval.push(i);
      } else {
        lastToken = token;
      }
    }

    for (var j = 0, m = forRemoval.length; j < m; j++) {
      tokens.splice(forRemoval[j] - j, 1);
    }
  };

  var reduceNonAdjacent = function(tokens) {
    var matched = {};
    var matchedMoreThanOnce = [];
    var partiallyReduced = [];
    var token, selector, selectors;
    var removeEmpty = function(value) {
      return value.length > 0 ? value : '';
    };

    for (var i = 0, l = tokens.length; i < l; i++) {
      token = tokens[i];
      selector = token.selector;

      if (typeof(token) == 'string' || token.block)
        continue;

      selectors = selector.split(',');
      if (selectors.length > 1)
        selectors.unshift(selector);

      for (var j = 0, m = selectors.length; j < m; j++) {
        var sel = selectors[j];
        var alreadyMatched = matched[sel];
        if (alreadyMatched) {
          if (alreadyMatched.length == 1)
            matchedMoreThanOnce.push(sel);
          alreadyMatched.push(i);
        } else {
          matched[sel] = [i];
        }
      }
    }

    matchedMoreThanOnce.forEach(function(selector) {
      var matchPositions = matched[selector];
      var bodies = [];
      var joinsAt = [];
      for (var j = 0, m = matchPositions.length; j < m; j++) {
        var body = tokens[matchPositions[j]].body;
        bodies.push(body);
        joinsAt.push((joinsAt[j - 1] || 0) + body.split(';').length);
      }

      var optimizedBody = propertyOptimizer.process(bodies.join(';'), joinsAt);
      var optimizedTokens = optimizedBody.split(';');

      var k = optimizedTokens.length - 1;
      var currentMatch = matchPositions.length - 1;

      while (currentMatch >= 0) {
        if (bodies[currentMatch].indexOf(optimizedTokens[k]) > -1 && k > -1) {
          k -= 1;
          continue;
        }

        var tokenIndex = matchPositions[currentMatch];
        var token = tokens[tokenIndex];
        var reducedBody = optimizedTokens
          .splice(k + 1)
          .filter(removeEmpty)
          .join(';');

        if (token.selector == selector) {
          token.body = reducedBody;
        } else {
          token._partials = token._partials || [];
          token._partials.push(reducedBody);

          if (partiallyReduced.indexOf(tokenIndex) == -1)
            partiallyReduced.push(tokenIndex);
        }

        currentMatch -= 1;
      }
    });

    // process those tokens which were partially reduced
    // i.e. at least one of token's selectors saw reduction
    // if all selectors were reduced to same value we can override it
    for (i = 0, l = partiallyReduced.length; i < l; i++) {
      token = tokens[partiallyReduced[i]];
      selectors = token.selector.split(',');

      if (token._partials.length == selectors.length && token.body != token._partials[0]) {
        var newBody = token._partials[0];
        for (var k = 1, n = token._partials.length; k < n; k++) {
          if (token._partials[k] != newBody)
            break;
        }

        if (k == n)
          token.body = newBody;
      }

      delete token._partials;
    }
  };

  var optimize = function(tokens) {
    tokens = (Array.isArray(tokens) ? tokens : [tokens]);
    for (var i = 0, l = tokens.length; i < l; i++) {
      var token = tokens[i];

      if (token.selector) {
        token.selector = cleanUpSelector(token.selector);
        token.body = propertyOptimizer.process(token.body, false);
      } else if (token.block) {
        optimize(token.body);
      }
    }

    removeDuplicates(tokens);
    mergeAdjacent(tokens);
    reduceNonAdjacent(tokens);
  };

  var rebuild = function(tokens) {
    return (Array.isArray(tokens) ? tokens : [tokens])
      .map(function(token) {
        if (typeof token == 'string')
          return token;

        if (token.block)
          return token.block + '{' + rebuild(token.body) + '}';
        else
          return token.selector + '{' + token.body + '}';
      })
      .join(options.keepBreaks ? options.lineBreak : '');
  };

  return {
    process: function() {
      var tokenized = new Tokenizer(data, context).process();
      optimize(tokenized);
      return rebuild(tokenized);
    }
  };
};

function Tokenizer(data, minifyContext) {
  var whatsNext = function(context) {
    var cursor = context.cursor;
    var mode = context.mode;
    var closest;

    if (mode == 'body') {
      closest = data.indexOf('}', cursor);
      return closest > -1 ?
        [closest, 'bodyEnd'] :
        null;
    }

    var nextSpecial = data.indexOf('@', cursor);
    var nextEscape = mode == 'top' ? data.indexOf('__ESCAPED_COMMENT_CLEAN_CSS', cursor) : -1;
    var nextBodyStart = data.indexOf('{', cursor);
    var nextBodyEnd = data.indexOf('}', cursor);

    closest = nextSpecial;
    if (closest == -1 || (nextEscape > -1 && nextEscape < closest))
      closest = nextEscape;
    if (closest == -1 || (nextBodyStart > -1 && nextBodyStart < closest))
      closest = nextBodyStart;
    if (closest == -1 || (nextBodyEnd > -1 && nextBodyEnd < closest))
      closest = nextBodyEnd;

    if (closest == -1)
      return;
    if (nextEscape === closest)
      return [closest, 'escape'];
    if (nextBodyStart === closest)
      return [closest, 'bodyStart'];
    if (nextBodyEnd === closest)
      return [closest, 'bodyEnd'];
    if (nextSpecial === closest)
      return [closest, 'special'];
  };

  var tokenize = function(context) {
    var tokenized = [];

    context = context || { cursor: 0, mode: 'top' };

    while (true) {
      var next = whatsNext(context);
      if (!next) {
        var whatsLeft = data.substring(context.cursor);
        if (whatsLeft.length > 0) {
          tokenized.push(whatsLeft);
          context.cursor += whatsLeft.length;
        }
        break;
      }

      var nextSpecial = next[0];
      var what = next[1];
      var nextEnd;
      var oldMode;

      if (what == 'special') {
        var fragment = data.substring(nextSpecial, context.cursor + '@font-face'.length + 1);
        var isSingle = fragment.indexOf('@import') === 0 || fragment.indexOf('@charset') === 0;
        if (isSingle) {
          nextEnd = data.indexOf(';', nextSpecial + 1);
          tokenized.push(data.substring(context.cursor, nextEnd + 1));

          context.cursor = nextEnd + 1;
        } else {
          nextEnd = data.indexOf('{', nextSpecial + 1);
          var block = data.substring(context.cursor, nextEnd).trim();

          var isFlat = fragment.indexOf('@font-face') === 0;
          oldMode = context.mode;
          context.cursor = nextEnd + 1;
          context.mode = isFlat ? 'body' : 'block';
          var specialBody = tokenize(context);
          context.mode = oldMode;

          tokenized.push({ block: block, body: specialBody });
        }
      } else if (what == 'escape') {
        nextEnd = data.indexOf('__', nextSpecial + 1);
        var escaped = data.substring(context.cursor, nextEnd + 2);
        tokenized.push(escaped);

        context.cursor = nextEnd + 2;
      } else if (what == 'bodyStart') {
        var selector = data.substring(context.cursor, nextSpecial).trim();

        oldMode = context.mode;
        context.cursor = nextSpecial + 1;
        context.mode = 'body';
        var body = tokenize(context);
        context.mode = oldMode;

        tokenized.push({ selector: selector, body: body });
      } else if (what == 'bodyEnd') {
        // extra closing brace at the top level can be safely ignored
        if (context.mode == 'top') {
          var at = context.cursor;
          var warning = data[context.cursor] == '}' ?
            'Unexpected \'}\' in \'' + data.substring(at - 20, at + 20) + '\'. Ignoring.' :
            'Unexpected content: \'' + data.substring(at, nextSpecial + 1) + '\'. Ignoring.';

          minifyContext.warnings.push(warning);
          context.cursor = nextSpecial + 1;
          continue;
        }

        if (context.mode != 'block')
          tokenized = data.substring(context.cursor, nextSpecial);

        context.cursor = nextSpecial + 1;

        break;
      }
    }

    return tokenized;
  };

  return {
    process: function() {
      return tokenize();
    }
  };
};

// lib/text/*

function CommentsProcessor(keepSpecialComments, keepBreaks, lineBreak) {
  var comments = new EscapeStore('COMMENT');

  return {
    // Strip special comments (/*! ... */) by replacing them by a special marker
    // for further restoring. Plain comments are removed. It's done by scanning data using
    // String#indexOf scanning instead of regexps to speed up the process.
    escape: function(data) {
      var tempData = [];
      var nextStart = 0;
      var nextEnd = 0;
      var cursor = 0;

      for (; nextEnd < data.length; ) {
        nextStart = data.indexOf('/*', nextEnd);
        nextEnd = data.indexOf('*/', nextStart + 2);
        if (nextStart == -1 || nextEnd == -1)
          break;

        tempData.push(data.substring(cursor, nextStart));
        if (data[nextStart + 2] == '!') {
          // in case of special comments, replace them with a placeholder
          var comment = data.substring(nextStart, nextEnd + 2);
          var placeholder = comments.store(comment);
          tempData.push(placeholder);
        }
        cursor = nextEnd + 2;
      }

      return tempData.length > 0 ?
        tempData.join('') + data.substring(cursor, data.length) :
        data;
    },

    restore: function(data) {
      var restored = 0;
      var breakSuffix = keepBreaks ? lineBreak : '';

      return data.replace(new RegExp(comments.placeholderPattern + '(' + lineBreak + '| )?', 'g'), function(match, placeholder) {
        restored++;

        switch (keepSpecialComments) {
          case '*':
            return comments.restore(placeholder) + breakSuffix;
          case 1:
          case '1':
            return restored == 1 ?
              comments.restore(placeholder) + breakSuffix :
              '';
          case 0:
          case '0':
            return '';
        }
      });
    }
  };
};

function EscapeStore(placeholderRoot) {
  placeholderRoot = 'ESCAPED_' + placeholderRoot + '_CLEAN_CSS';

  var placeholderToData = {};
  var dataToPlaceholder = {};
  var count = 0;
  var nextPlaceholder = function() {
    return '__' + placeholderRoot + (count++) + '__';
  };
  var pattern = '(__' + placeholderRoot + '\\d{1,}__)';

  return {
    placeholderPattern: pattern,

    placeholderRegExp: new RegExp(pattern, 'g'),

    store: function(data) {
      var placeholder = dataToPlaceholder[data];
      if (!placeholder) {
        placeholder = nextPlaceholder();
        placeholderToData[placeholder] = data;
        dataToPlaceholder[data] = placeholder;
      }

      return placeholder;
    },

    restore: function(placeholder) {
      return placeholderToData[placeholder];
    }
  };
};

function ExpressionsProcessor() {
  var expressions = new EscapeStore('EXPRESSION');

  var findEnd = function(data, start) {
    var end = start + 'expression'.length;
    var level = 0;
    var quoted = false;

    while(true) {
      var next = data[end++];

      if (quoted) {
        quoted = next != '\'' && next != '"';
      } else {
        quoted = next == '\'' || next == '"';

        if (next == '(')
          level++;
        if (next == ')')
          level--;
        if (next == '}' && level == 1) {
          end--;
          level--;
        }
      }

      if (level === 0 || !next)
        break;
    }

    return end;
  };

  return {
    // Escapes expressions by replacing them by a special
    // marker for further restoring. It's done via string scanning
    // instead of regexps to speed up the process.
    escape: function(data) {
      var nextStart = 0;
      var nextEnd = 0;
      var cursor = 0;
      var tempData = [];

      for (; nextEnd < data.length; ) {
        nextStart = data.indexOf('expression(', nextEnd);
        if (nextStart == -1)
          break;

        nextEnd = findEnd(data, nextStart);

        var expression = data.substring(nextStart, nextEnd);
        var placeholder = expressions.store(expression);
        tempData.push(data.substring(cursor, nextStart));
        tempData.push(placeholder);
        cursor = nextEnd;
      }

      return tempData.length > 0 ?
        tempData.join('') + data.substring(cursor, data.length) :
        data;
    },

    restore: function(data) {
      return data.replace(expressions.placeholderRegExp, expressions.restore);
    }
  };
};

function FreeTextProcessor() {
  var texts = new EscapeStore('FREE_TEXT');

  var findNonEscapedEnd = function(data, matched, start) {
    var end = start;
    while (true) {
      end = data.indexOf(matched, end);

      if (end > -1 && data[end - 1] == '\\') {
        end += 1;
        continue;
      } else {
        break;
      }
    }

    return end;
  };

  return {
    // Strip content tags by replacing them by the a special
    // marker for further restoring. It's done via string scanning
    // instead of regexps to speed up the process.
    escape: function(data) {
      var tempData = [];
      var nextStart = 0;
      var nextEnd = 0;
      var cursor = 0;
      var matchedParenthesis = null;
      var singleParenthesis = '\'';
      var doubleParenthesis = '"';
      var dataLength = data.length;

      for (; nextEnd < data.length; ) {
        var nextStartSingle = data.indexOf(singleParenthesis, nextEnd + 1);
        var nextStartDouble = data.indexOf(doubleParenthesis, nextEnd + 1);

        if (nextStartSingle == -1)
          nextStartSingle = dataLength;
        if (nextStartDouble == -1)
          nextStartDouble = dataLength;

        if (nextStartSingle < nextStartDouble) {
          nextStart = nextStartSingle;
          matchedParenthesis = singleParenthesis;
        } else {
          nextStart = nextStartDouble;
          matchedParenthesis = doubleParenthesis;
        }

        if (nextStart == -1)
          break;

        nextEnd = findNonEscapedEnd(data, matchedParenthesis, nextStart + 1);
        if (nextEnd == -1)
          break;

        var text = data.substring(nextStart, nextEnd + 1);
        var placeholder = texts.store(text);
        tempData.push(data.substring(cursor, nextStart));
        tempData.push(placeholder);
        cursor = nextEnd + 1;
      }

      return tempData.length > 0 ?
        tempData.join('') + data.substring(cursor, data.length) :
        data;
    },

    restore: function(data) {
      return data.replace(texts.placeholderRegExp, texts.restore);
    }
  };
};

function UrlsProcessor() {
  var urls = new EscapeStore('URL');

  return {
    // Strip urls by replacing them by a special
    // marker for further restoring. It's done via string scanning
    // instead of regexps to speed up the process.
    escape: function(data) {
      var nextStart = 0;
      var nextEnd = 0;
      var cursor = 0;
      var tempData = [];

      for (; nextEnd < data.length; ) {
        nextStart = data.indexOf('url(', nextEnd);
        if (nextStart == -1)
          break;

        nextEnd = data.indexOf(')', nextStart);

        var url = data.substring(nextStart, nextEnd + 1);
        var placeholder = urls.store(url);
        tempData.push(data.substring(cursor, nextStart));
        tempData.push(placeholder);
        cursor = nextEnd + 1;
      }

      return tempData.length > 0 ?
        tempData.join('') + data.substring(cursor, data.length) :
        data;
    },

    restore: function(data) {
      return data.replace(urls.placeholderRegExp, urls.restore);
    }
  };
};

// lib/clean.js

function CleanCSS(options) {
  var lineBreak = process.platform == 'win32' ? '\r\n' : '\n';
  var stats = {};
  var context = {
    errors: [],
    warnings: []
  };

  options = options || {};
  options.keepBreaks = options.keepBreaks || false;

  //active by default
  if (options.processImport === undefined)
    options.processImport = true;

  var minify = function(data) {
    if (Buffer.isBuffer(data))
      data = data.toString();

    var startedAt;
    if (options.debug) {
      startedAt = process.hrtime();
      stats.originalSize = data.length;
    }

    var replace = function() {
      if (typeof arguments[0] == 'function')
        arguments[0]();
      else
        data = data.replace.apply(data, arguments);
    };

    // replace function
    if (options.benchmark) {
      var originalReplace = replace;
      replace = function(pattern, replacement) {
        var name = typeof pattern == 'function' ?
          /function (\w+)\(/.exec(pattern.toString())[1] :
          pattern;

        var start = process.hrtime();
        originalReplace(pattern, replacement);

        var itTook = process.hrtime(start);
        console.log('%d ms: ' + name, 1000 * itTook[0] + itTook[1] / 1000000.0);
      };
    }

    var commentsProcessor = new CommentsProcessor(
      'keepSpecialComments' in options ? options.keepSpecialComments : '*',
      options.keepBreaks,
      lineBreak
    );
    var expressionsProcessor = new ExpressionsProcessor();
    var freeTextProcessor = new FreeTextProcessor();
    var urlsProcessor = new UrlsProcessor();
    var importInliner = new ImportInliner(context);

    if (options.processImport) {
      // inline all imports
      replace(function inlineImports() {
        data = importInliner.process(data, {
          root: options.root || process.cwd(),
          relativeTo: options.relativeTo
        });
      });
    }

    replace(function escapeComments() {
      data = commentsProcessor.escape(data);
    });

    // replace all escaped line breaks
    replace(/\\(\r\n|\n)/mg, '');

    // strip parentheses in urls if possible (no spaces inside)
    replace(/url\((['"])([^\)]+)['"]\)/g, function(match, quote, url) {
      var unsafeDataURI = url.indexOf('data:') === 0 && url.match(/data:\w+\/[^;]+;base64,/) === null;
      if (url.match(/[ \t]/g) !== null || unsafeDataURI)
        return 'url(' + quote + url + quote + ')';
      else
        return 'url(' + url + ')';
    });

    // strip parentheses in animation & font names
    replace(/(animation|animation\-name|font|font\-family):([^;}]+)/g, function(match, propertyName, def) {
      return propertyName + ':' + def.replace(/['"]([a-zA-Z][a-zA-Z\d\-_]+)['"]/g, '$1');
    });

    // strip parentheses in @keyframes
    replace(/@(\-moz\-|\-o\-|\-webkit\-)?keyframes ([^{]+)/g, function(match, prefix, name) {
      prefix = prefix || '';
      return '@' + prefix + 'keyframes ' + (name.indexOf(' ') > -1 ? name : name.replace(/['"]/g, ''));
    });

    // IE shorter filters, but only if single (IE 7 issue)
    replace(/progid:DXImageTransform\.Microsoft\.(Alpha|Chroma)(\([^\)]+\))([;}'"])/g, function(match, filter, args, suffix) {
      return filter.toLowerCase() + args + suffix;
    });

    replace(function escapeExpressions() {
      data = expressionsProcessor.escape(data);
    });

    // strip parentheses in attribute values
    replace(/\[([^\]]+)\]/g, function(match, content) {
      var eqIndex = content.indexOf('=');
      var singleQuoteIndex = content.indexOf('\'');
      var doubleQuoteIndex = content.indexOf('"');
      if (eqIndex < 0 && singleQuoteIndex < 0 && doubleQuoteIndex < 0)
        return match;
      if (singleQuoteIndex === 0 || doubleQuoteIndex === 0)
        return match;

      var key = content.substring(0, eqIndex);
      var value = content.substring(eqIndex + 1, content.length);

      if (/^['"](?:[a-zA-Z][a-zA-Z\d\-_]+)['"]$/.test(value))
        return '[' + key + '=' + value.substring(1, value.length - 1) + ']';
      else
        return match;
    });

    replace(function escapeFreeText() {
      data = freeTextProcessor.escape(data);
    });

    replace(function escapeUrls() {
      data = urlsProcessor.escape(data);
    });

    // line breaks
    replace(/[\r]?\n/g, ' ');

    // multiple whitespace
    replace(/[\t ]+/g, ' ');

    // multiple semicolons (with optional whitespace)
    replace(/;[ ]?;+/g, ';');

    // multiple line breaks to one
    replace(/ (?:\r\n|\n)/g, lineBreak);
    replace(/(?:\r\n|\n)+/g, lineBreak);

    // remove spaces around selectors
    replace(/ ([+~>]) /g, '$1');

    // remove extra spaces inside content
    replace(/([!\(\{\}:;=,\n]) /g, '$1');
    replace(/ ([!\)\{\};=,\n])/g, '$1');
    replace(/(?:\r\n|\n)\}/g, '}');
    replace(/([\{;,])(?:\r\n|\n)/g, '$1');
    replace(/ :([^\{\};]+)([;}])/g, ':$1$2');

    // restore spaces inside IE filters (IE 7 issue)
    replace(/progid:[^(]+\(([^\)]+)/g, function(match) {
      return match.replace(/,/g, ', ');
    });

    // trailing semicolons
    replace(/;\}/g, '}');

    replace(function hsl2Hex() {
      data = new ColorHSLToHex(data).process();
    });

    replace(function rgb2Hex() {
      data = new ColorRGBToHex(data).process();
    });

    replace(function longToShortHex() {
      data = new ColorLongToShortHex(data).process();
    });

    replace(function shortenColors() {
      data = new ColorShortener(data).process();
    });

    // replace font weight with numerical value
    replace(/(font\-weight|font):(normal|bold)([ ;\}!])(\w*)/g, function(match, property, weight, suffix, next) {
      if (suffix == ' ' && next.length > 0 && !/[.\d]/.test(next))
        return match;

      if (weight == 'normal')
        return property + ':400' + suffix + next;
      else if (weight == 'bold')
        return property + ':700' + suffix + next;
      else
        return match;
    });

    // zero + unit to zero
    replace(/(\s|:|,)0(?:px|em|ex|cm|mm|in|pt|pc|%)/g, '$1' + '0');
    replace(/rect\(0(?:px|em|ex|cm|mm|in|pt|pc|%)/g, 'rect(0');

    // fraction zeros removal
    replace(/\.([1-9]*)0+(\D)/g, function(match, nonZeroPart, suffix) {
      return (nonZeroPart ? '.' : '') + nonZeroPart + suffix;
    });

    // restore 0% in hsl/hsla
    replace(/(hsl|hsla)\(([^\)]+)\)/g, function(match, colorFunction, colorDef) {
      var tokens = colorDef.split(',');
      if (tokens[1] == '0')
        tokens[1] = '0%';
      if (tokens[2] == '0')
        tokens[2] = '0%';
      return colorFunction + '(' + tokens.join(',') + ')';
    });

    // none to 0
    replace(/(border|border-top|border-right|border-bottom|border-left|outline):none/g, '$1:0');

    // background:none to background:0 0
    replace(/background:(?:none|transparent)([;}])/g, 'background:0 0$1');

    // multiple zeros into one
    replace(/box-shadow:0 0 0 0([^\.])/g, 'box-shadow:0 0$1');
    replace(/:0 0 0 0([^\.])/g, ':0$1');
    replace(/([: ,=\-])0\.(\d)/g, '$1.$2');

    replace(function shorthandNotations() {
      data = new ShorthandNotations(data).process();
    });

    // restore rect(...) zeros syntax for 4 zeros
    replace(/rect\(\s?0(\s|,)0[ ,]0[ ,]0\s?\)/g, 'rect(0$10$10$10)');

    // remove universal selector when not needed (*#id, *.class etc)
    replace(/\*([\.#:\[])/g, '$1');

    // Restore spaces inside calc back
    replace(/calc\([^\}]+\}/g, function(match) {
      return match.replace(/\+/g, ' + ');
    });

    if (options.noAdvanced) {
      if (options.keepBreaks)
        replace(/\}/g, '}' + lineBreak);
    } else {
      replace(function optimizeSelectors() {
        data = new SelectorsOptimizer(data, context, {
          keepBreaks: options.keepBreaks,
          lineBreak: lineBreak,
          selectorsMergeMode: options.selectorsMergeMode
        }).process();
      });
    }

    replace(function restoreUrls() {
      data = urlsProcessor.restore(data);
    });
    replace(function rebaseUrls() {
      data = options.noRebase ? data : new UrlRebase(options, context).process(data);
    });
    replace(function restoreFreeText() {
      data = freeTextProcessor.restore(data);
    });
    replace(function restoreComments() {
      data = commentsProcessor.restore(data);
    });
    replace(function restoreExpressions() {
      data = expressionsProcessor.restore(data);
    });

    // move first charset to the beginning
    replace(function moveCharset() {
      // get first charset in stylesheet
      var match = data.match(/@charset [^;]+;/);
      var firstCharset = match ? match[0] : null;
      if (!firstCharset)
        return;

      // reattach first charset and remove all subsequent
      data = firstCharset +
        (options.keepBreaks ? lineBreak : '') +
        data.replace(new RegExp('@charset [^;]+;(' + lineBreak + ')?', 'g'), '').trim();
    });

    replace(function removeEmptySelectors() {
      data = new EmptyRemoval(data).process();
    });

    // trim spaces at beginning and end
    data = data.trim();

    if (options.debug) {
      var elapsed = process.hrtime(startedAt);
      stats.timeSpent = ~~(elapsed[0] * 1e3 + elapsed[1] / 1e6);
      stats.efficiency = 1 - data.length / stats.originalSize;
      stats.minifiedSize = data.length;
    }

    return data;
  };

  return {
    errors: context.errors,
    lineBreak: lineBreak,
    options: options,
    minify: minify,
    stats: stats,
    warnings: context.warnings
  };
};
