var vows = require('vows');
var assert = require('assert');
var exec = require('child_process').exec;
var fs = require('fs');

var binaryContext = function(options, context) {
  context.topic = function() {
    // We add __DIRECT__=1 to switch binary into 'non-piped' mode
    exec("__DIRECT__=1 node ./clean-css.js " + options, this.callback);
  };
  return context;
};

var fileBinaryContext = function(dataFile) {
  return {
    topic: function() {
      exec("__DIRECT__=1 node ./clean-css.js -b -e -r ./test/data ./test/data/" + dataFile, { maxBuffer: 1000 * 1024 }, this.callback);
    },
    'should minimize': function(error, stdout) {
      var reference = fs.readFileSync('./test/data/' + dataFile.replace('.css', '-min.css'), 'utf-8');
      var splitReference = reference.split('\n');
      var splitOutput = stdout.split('\n');
      assert.equal(splitReference.length, splitOutput.length);

      splitReference.forEach(function(line, i) {
        assert.equal(line, splitOutput[i]);
      });
    }
  };
};

var pipedContext = function(css, options, context) {
  context.topic = function() {
    exec("echo \"" + css + "\" | node ./clean-css.js " + options, this.callback);
  };
  return context;
};

exports.commandsSuite = vows.describe('binary commands').addBatch({
  'no options': binaryContext('', {
    'should output help': function(stdout) {
      assert.equal(/usage:/.test(stdout), true);
    }
  }),
  'help': binaryContext('-h', {
    'should output help': function(error, stdout) {
      assert.equal(/usage:/.test(stdout), true);
    }
  }),
  'version': binaryContext('-v', {
    'should output help': function(error, stdout) {
      assert.equal(stdout, "1.1.7\n");
    }
  }),
  'stdin': pipedContext("a{color: #f00}", '', {
    'should output data': function(error, stdout) {
      assert.equal(stdout, "a{color:red}");
    }
  }),
  'no empty by default': pipedContext('a{}', '', {
    'should preserve content': function(error, stdout) {
      assert.equal(stdout, "a{}");
    }
  }),
  'empty': pipedContext('a{}', '-e', {
    'should preserve content': function(error, stdout) {
      assert.equal(stdout, "");
    }
  }),
  'all special comments': pipedContext('/*!c1*/a{}/*!c2*//*c3*/', '', {
    'should be kept': function(error, stdout) {
      assert.equal(stdout, "/*!c1*/a{}/*!c2*/");
    }
  }),
  'one special comment': pipedContext('/*!c1*/a{}/*!c2*//*c3*/', '--s1', {
    'should be kept': function(error, stdout) {
      assert.equal(stdout, "/*!c1*/a{}");
    }
  }),
  'no special comments': pipedContext('/*!c1*/a{}/*!c2*//*c3*/', '--s0', {
    'should be kept': function(error, stdout) {
      assert.equal(stdout, "a{}");
    }
  }),
  'no relative to path': binaryContext('./test/data/partials-absolute/base.css', {
    'should not be able to resolve it fully': function(error, stdout, stderr) {
      assert.equal(stdout, '');
      assert.notEqual(stderr, '');
    }
  }),
  'relative to path': binaryContext('-r ./test/data ./test/data/partials-absolute/base.css', {
    'should be able to resolve it': function(error, stdout) {
      assert.equal(stdout, '.base2{border-width:0}.sub{padding:0}.base{margin:0}');
    }
  }),
  'from source - 960.css': fileBinaryContext('960.css'),
  'from source - big.css': fileBinaryContext('big.css'),
  'from source - blueprint.css': fileBinaryContext('blueprint.css'),
  'from source - reset.css': fileBinaryContext('reset.css'),
  'to file': binaryContext('-o reset-min.css ./test/data/reset.css', {
    'should give no output': function(error, stdout) {
      assert.equal(stdout, '');
    },
    'should minimize': function(stdout) {
      var minimized = fs.readFileSync('./test/data/reset-min.css', 'utf-8').replace(/\n/g, '');
      var target = fs.readFileSync('./reset-min.css', 'utf-8').replace(/\n/g, '');
      assert.equal(minimized, target);
    },
    teardown: function() {
      exec('rm reset-min.css');
    }
  })
});
