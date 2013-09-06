#!/usr/bin/env node

var util = require("util");
var fs = require('fs');
var path = require('path');

var options = {
  source: null,
  target: null
};
var cleanOptions = {};
var fromStdin = !process.env['__DIRECT__'] && !process.stdin.isTTY;
var version = "1.1.1";

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
if (argv.has('-e'))
  cleanOptions.removeEmpty = true;
if (argv.has('-b'))
  cleanOptions.keepBreaks = true;
if (argv.has('--s1'))
  cleanOptions.keepSpecialComments = 1;
if (argv.has('--s0'))
  cleanOptions.keepSpecialComments = 0;
if (argv.has('-s'))
  cleanOptions.processImport = false;
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
  util.puts("usage: node clean-css.js [options] -o <output-file> <input-file>\n");
  util.puts("options:");
  util.puts("  -e\tRemove empty declarations (e.g. a{})");
  util.puts("  -b\tKeep line breaks");
  util.puts("  --s0\tRemove all special comments (i.e. /*! special comment */)");
  util.puts("  --s1\tRemove all special comments but the first one");
  util.puts("  -s\tDisable the @import processing");
  util.puts("  -r\tSet a root path to which resolve absolute @import rules");
  util.puts("  -d\tShow debug information (minification time & compression efficiency)");
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
  var minified;

  if (options.debug) {
    var start = process.hrtime();
    minified = CleanCSS.process(data, cleanOptions);
    var taken = process.hrtime(start);

    console.error('Minification time: %dms', ~~(taken[0] * 1e3 + taken[1] / 1e6));
    console.error('Compression efficiency: %d%', ~~((1 - minified.length / CleanCSS.originalSize) * 100));
  } else {
    minified = CleanCSS.process(data, cleanOptions);
  }

  return minified;
}

function output(minified) {
  if (options.target)
    fs.writeFileSync(options.target, minified, 'utf8');
  else
    process.stdout.write(minified);
};


// CleanCSS

var ColorShortener = function Shortener(data) {
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

var ColorHSLToHex = function HSLToHex(data) {
  // HSL to RGB converter. Both methods adapted from:
  // http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
  var hslToRgb = function(h, s, l) {
    var r, g, b;

    h = ~~h / 360;
    s = ~~s / 100;
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
      return data.replace(/hsl\((\d+),(\d+)%?,(\d+)%?\)/g, function(match, hue, saturation, lightness) {
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

var ColorRGBToHex = function RGBToHex(data) {
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

var ColorLongToShortHex = function LongToShortHex(data) {
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

var ShorthandNotations = function ShorthandNotations(data) {
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

var ImportInliner = function Inliner() {
  var process = function(data, options) {
    var tempData = [];
    var nextStart = 0;
    var nextEnd = 0;
    var cursor = 0;

    options.relativeTo = options.relativeTo || options.root;
    options._baseRelativeTo = options._baseRelativeTo || options.relativeTo;
    options.visited = options.visited || [];

    for (; nextEnd < data.length; ) {
      nextStart = data.indexOf('@import', cursor);
      if (nextStart == -1)
        break;

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

    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile())
      throw new Error('Broken @import declaration of "' + importedFile + '"');

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

var UrlRebase = {
  process: function(data, options) {
    var rebaseOpts = {
      absolute: !!options.root,
      relative: !options.root && !!options.target,
      fromBase: options.relativeTo
    };

    if (!rebaseOpts.absolute && !rebaseOpts.relative)
      return data;

    if (rebaseOpts.absolute)
      rebaseOpts.toBase = path.resolve(options.root);

    if (rebaseOpts.relative)
      rebaseOpts.toBase = path.resolve(path.dirname(options.target));

    if (!rebaseOpts.fromBase || !rebaseOpts.toBase)
      return data;

    return UrlRewriter.process(data, rebaseOpts);
  }
};


var CommentsProcessor = function Comments(keepSpecialComments, keepBreaks, lineBreak) {
  var comments = [];

  return {
    // Strip special comments (/*! ... */) by replacing them by __CSSCOMMENT__ marker
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
          comments.push(data.substring(nextStart, nextEnd + 2));
          tempData.push('__CSSCOMMENT__');
        }
        cursor = nextEnd + 2;
      }

      return tempData.length > 0 ?
        tempData.join('') + data.substring(cursor, data.length) :
        data;
    },

    restore: function(data) {
      var commentsCount = comments.length;
      var breakSuffix = keepBreaks ? lineBreak : '';

      return data.replace(new RegExp('__CSSCOMMENT__(' + lineBreak + '| )?', 'g'), function() {
        switch (keepSpecialComments) {
          case '*':
            return comments.shift() + breakSuffix;
          case 1:
            return comments.length == commentsCount ?
              comments.shift() + breakSuffix :
              '';
          case 0:
            return '';
        }
      });
    }
  };
};

var ExpressionsProcessor = function Expressions() {
  var expressions = [];

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
      }

      if (level === 0 || !next)
        break;
    }

    return end;
  };

  return {
    // Escapes expressions by replacing them by the __EXPRESSION__
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

        tempData.push(data.substring(cursor, nextStart));
        tempData.push('__EXPRESSION__');
        expressions.push(data.substring(nextStart, nextEnd));
        cursor = nextEnd;
      }

      return tempData.length > 0 ?
        tempData.join('') + data.substring(cursor, data.length) :
        data;
    },

    restore: function(data) {
      return data.replace(/__EXPRESSION__/g, function() {
        return expressions.shift();
      });
    }
  };
};

var FreeTextProcessor = function Free() {
  var texts = [];

  return {
    // Strip content tags by replacing them by the __CSSFREETEXT__
    // marker for further restoring. It's done via string scanning
    // instead of regexps to speed up the process.
    escape: function(data) {
      var tempData = [];
      var nextStart = 0;
      var nextEnd = 0;
      var cursor = 0;
      var matchedParenthesis = null;
      var singleParenthesis = "'";
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

        nextEnd = data.indexOf(matchedParenthesis, nextStart + 1);
        if (nextStart == -1 || nextEnd == -1)
          break;

        tempData.push(data.substring(cursor, nextStart));
        tempData.push('__CSSFREETEXT__');
        texts.push(data.substring(nextStart, nextEnd + 1));
        cursor = nextEnd + 1;
      }

      return tempData.length > 0 ?
        tempData.join('') + data.substring(cursor, data.length) :
        data;
    },

    restore: function(data) {
      return data.replace(/__CSSFREETEXT__/g, function() {
        return texts.shift();
      });
    }
  };
};

var UrlsProcessor = function Urls() {
  var urls = [];

  return {
    // Strip urls by replacing them by the __URL__
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

        tempData.push(data.substring(cursor, nextStart));
        tempData.push('__URL__');
        urls.push(data.substring(nextStart, nextEnd + 1));
        cursor = nextEnd + 1;
      }

      return tempData.length > 0 ?
        tempData.join('') + data.substring(cursor, data.length) :
        data;
    },

    restore: function(data) {
      return data.replace(/__URL__/g, function() {
        return urls.shift();
      });
    }
  };
};

var CleanCSS = {
  process: function(data, options) {
    var replace = function() {
      if (typeof arguments[0] == 'function')
        arguments[0]();
      else
        data = data.replace.apply(data, arguments);
    };
    var lineBreak = process.platform == 'win32' ? '\r\n' : '\n';
    this.lineBreak = lineBreak;

    options = options || {};
    options.keepBreaks = options.keepBreaks || false;

    //active by default
    if (options.processImport === undefined)
      options.processImport = true;

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
    var importInliner = new ImportInliner();

    if (options.processImport) {
      // inline all imports
      replace(function inlineImports() {
        data = importInliner.process(data, {
          root: options.root || process.cwd(),
          relativeTo: options.relativeTo
        });
      });
    }

    this.originalSize = data.length;

    replace(function escapeComments() {
      data = commentsProcessor.escape(data);
    });

    // replace all escaped line breaks
    replace(/\\(\r\n|\n)/mg, '');

    // strip parentheses in urls if possible (no spaces inside)
    replace(/url\((['"])([^\)]+)['"]\)/g, function(match, quote, url) {
      if (url.match(/[ \t]/g) !== null || url.indexOf('data:') === 0)
        return 'url(' + quote + url + quote + ')';
      else
        return 'url(' + url + ')';
    });

    // strip parentheses in animation & font names
    replace(/(animation|animation\-name|font|font\-family):([^;}]+)/g, function(match, propertyName, fontDef) {
      return propertyName + ':' + fontDef.replace(/['"]([\w\-]+)['"]/g, '$1');
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
      if (eqIndex < 0 && content.indexOf('\'') < 0 && content.indexOf('"') < 0)
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
    if (!options.keepBreaks)
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
    replace(/(font|font\-weight):(normal|bold)([ ;\}!])/g, function(match, property, weight, suffix) {
      if (weight == 'normal')
        return property + ':400' + suffix;
      else if (weight == 'bold')
        return property + ':700' + suffix;
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

    // background:none to 0
    replace(/(background):none([;}])/g, '$1:0$2');

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

    replace(function restoreUrls() {
      data = urlsProcessor.restore(data);
    });
    replace(function rebaseUrls() {
      data = UrlRebase.process(data, options);
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
        data.replace(new RegExp('@charset [^;]+;(' + lineBreak + ')?', 'g'), '');
    });

    if (options.removeEmpty) {
      // empty elements
      replace(/[^\{\}]+\{\}/g, '');

      // empty @media declarations
      replace(/@media [^\{]+\{\}/g, '');
    }

    // trim spaces at beginning and end
    return data.trim();
  }
};
