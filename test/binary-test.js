var vows = require('vows');
var assert = require('assert');
var exec = require('child_process').exec;
var fs = require('fs');

var binaryContext = function(options, context) {
  context.topic = function() {
    // We add __DIRECT__=1 to switch binary into 'non-piped' mode
    exec('__DIRECT__=1 node ./clean-css.js ' + options, this.callback);
  };
  return context;
};

var fileBinaryContext = function(dataFile) {
  return {
    topic: function() {
      exec('__DIRECT__=1 node ./clean-css.js -b -e -r ./test/data ./test/data/' + dataFile, { maxBuffer: 1000 * 1024 }, this.callback);
    },
    'should minimize': function(error, stdout) {
      var reference = fs.readFileSync('./test/data/' + dataFile.replace('.css', '-min.css'), 'utf-8').trim();
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
    exec('echo \'' + css + '\' | node ./clean-css.js ' + options, this.callback);
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
      assert.equal(stdout, '2.0.5\n');
    }
  }),
  'stdin': pipedContext('a{color: #f00}', '', {
    'should output data': function(error, stdout) {
      assert.equal(stdout, 'a{color:red}');
    }
  }),
  'empty': pipedContext('a{}', '', {
    'should preserve content': function(error, stdout) {
      assert.equal(stdout, '');
    }
  }),
  'no advanced': pipedContext('a{color:red}p{color:red}', '--skip-advanced', {
    'should preserve content': function(error, stdout) {
      assert.equal(stdout, 'a{color:red}p{color:red}');
    }
  }),
  'selectors merge mode - *': pipedContext('p:nth-child(2n){color:red}a{color:red}', '', {
    'should preserve content': function(error, stdout) {
      assert.equal(stdout, 'a,p:nth-child(2n){color:red}');
    }
  }),
  'selectors merge mode - ie8': pipedContext('p:nth-child(2n){color:red}a{color:red}', '--selectors-merge-mode ie8', {
    'should preserve content': function(error, stdout) {
      assert.equal(stdout, 'p:nth-child(2n){color:red}a{color:red}');
    }
  }),
  'all special comments': pipedContext('/*!c1*/a{color:red}/*!c2*//*c3*/', '', {
    'should be kept': function(error, stdout) {
      assert.equal(stdout, '/*!c1*/a{color:red}/*!c2*/');
    }
  }),
  'one special comment': pipedContext('/*!c1*/a{color:red}/*!c2*//*c3*/', '--s1', {
    'should be kept': function(error, stdout) {
      assert.equal(stdout, '/*!c1*/a{color:red}');
    }
  }),
  'no special comments': pipedContext('/*!c1*/a{color:red}/*!c2*//*c3*/', '--s0', {
    'should be kept': function(error, stdout) {
      assert.equal(stdout, 'a{color:red}');
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
