var assert = require('assert');
var async = require('async');
var redis = require('redis');
var LB = require('../');

// Constants
var DBINDEX = 15;
var PAGESIZE = 5;

// Before all suites
before(function(done) {
  // Initialize a subject leaderboard before all suites
  this.board = new LB('general', {pageSize: PAGESIZE}, {db: DBINDEX});

  // Creating connection to the redis and 
  // changing the current selected database
  this.client = redis.createClient();
  this.client.select(DBINDEX, done);
});

describe('Leaderboard', function() {
  describe('constructor', function() {
    // Empty database before the suite
    before(function(done) {
      this.client.flushdb(done);
    });

    it('should have possibility to take RedisClient instance', function(done) {
      var client = redis.createClient();
      client.select(DBINDEX + 1);
      client.flushdb(function() {

        var board1 = new LB('__redis__', null, client);
        var board2 = new LB('__redis__', null, client);
        var board3 = new LB('__redis__', null, {db: DBINDEX});

        async.parallel([
          function(cb) { board1.add('member1', 10, cb); },
          function(cb) { board2.add('member2', 20, cb); }
        ], function() {
          
          board1.list(function(err, list) {
            assert.deepEqual(list, [
              {'member': 'member2', 'score': 20},
              {'member': 'member1', 'score': 10}
            ]);

            board3.list(function(err, list) {
              assert.deepEqual(list, []);
              done();
            });
          });
        });

      });
    });

  });

  describe('"add" method', function() {
    // Empty database before the suite
    before(function(done) {
      this.client.flushdb(done);
    });
    
    it('should put "member1" with score 30 to the 0 position', function(done) {
      var board = this.board;
      board.add('member1', 30, function() {
        board.rank('member1',  function(err, rank) {
          assert.equal(rank, 0);
          done();
        });
      });
    });

    it('should put "member2" with score 20 to the 1 position', function(done) {
      var board = this.board;
      board.add('member2', 20, function() {
        board.rank('member2',  function(err, rank) {
          assert.equal(rank, 1);
          done();
        });
      });
    });

    it('should put "member3" with score 10 to the 2 position', function(done) {
      var board = this.board;
      board.add('member3', 10, function() {
        board.rank('member3',  function(err, rank) {
          assert.equal(rank, 2);
          done();
        });
      });
    });

    it('should put "member3" with score 40 to the 0 position', function(done) {
      var board = this.board;
      board.add('member3', 40, function() {
        board.rank('member3',  function(err, rank) {
          assert.equal(rank, 0);
          done();
        });
      });
    });

    it('shoud take "callback" argument as optional', function(done) {
      this.board.add('member100', 100);
      done();
    });

  });

  describe('"incr" method', function() {
    // Empty database before the suite
    before(function(done) {
      this.client.flushdb(done);
    });
    
    it('should add members if they don\'t exist', function(done) {
      var board = this.board;
      board.incr('member1', 10, function() {
      board.incr('member2', 20, function() {
        board.list(function(err, list) {
          assert.deepEqual(list, [
            {'member': 'member2', 'score': 20},
            {'member': 'member1', 'score': 10}
          ]);
          done();
        });
      });
      });
    });

    it('should increment members\' score if they do exist', function(done) {
      var board = this.board;
      board.incr('member1', 100, function() {
        board.score('member1', function(err, score) {
          assert.equal(score, 110);
          done();
        });
      });
    });

    it('should decrement members\' score if score value is negative', function(done) {
      var board = this.board;
      board.incr('member1', -20, function() {
        board.score('member1', function(err, score) {
          assert.equal(score,  90);
          done();
        });
      });
    });

    it('should keep correct members order', function(done) {
      this.board.list(function(err, list) {
        assert.deepEqual(list, [
          {'member': 'member1', 'score': 90},
          {'member': 'member2', 'score': 20}
        ]);
        done();
      });
    });

    it('shoud take "callback" argument as optional', function(done) {
      this.board.incr('member100', 100);
      done();
    });

  });

  describe('"rank" method', function() {
    // Empty database before the suite
    before(function(done) {
      this.client.flushdb(done);
    });
    
    it('should return correct rank #1', function(done) {
      var board = this.board;
      board.add('member1', 50, function() {
        board.rank('member1', function(err, rank) {
          assert.equal(rank, 0);
          done();
        });
      });
    });

    it('should return correct rank #2', function(done) {
      var board = this.board;
      board.add('member2', 40, function() {
        board.rank('member2', function(err, rank) {
          assert.equal(rank, 1);
          done();
        });
      });
    });

    it('should return correct rank #3', function(done) {
      var board = this.board;
      board.add('member3', 30, function() {
        board.rank('member3', function(err, rank) {
          assert.equal(rank, 2);
          done();
        });
      });
    });

    it('should return -1 if member isn\'t in the leaderboard', function(done) {
      this.board.rank('piska', function(err, rank) {
        assert.equal(rank, -1);
        done();
      });
    });

  });

  describe('"list" method', function() {
    // Empty database before the suite
    before(function(done) {
      this.client.flushdb(done);
    });
    
    it('should return correct list #1', function(done) {
      var board = this.board;
      board.add('member1', 50, function() {
        board.list(function(err, list) {
          assert.deepEqual(list, [{'member': 'member1', 'score': 50}]);
          done();
        });
      });
    });

    it('should return correct list #2', function(done) {
      var board = this.board;
      board.add('member2', 60, function() {
        board.list(function(err, list) {
          assert.deepEqual(list, [
            {'member': 'member2', 'score': 60},
            {'member': 'member1', 'score': 50}
          ]);
          done();
        });
      });
    });

    it('should return correct list #3', function(done) {
      var board = this.board;
      board.add('member3', 40, function() {
        board.list(function(err, list) {
          assert.deepEqual(list, [
            {'member': 'member2', 'score': 60},
            {'member': 'member1', 'score': 50},
            {'member': 'member3', 'score': 40}
          ]);
          done();
        });
      });
    });

    it('should return correct number of entries for the page 0', function(done) {
      var board = new LB('general', {pageSize: 5}, {db: DBINDEX});

      async.parallel([
        function(cb) { board.add('member4', 60, cb); },
        function(cb) { board.add('member5', 70, cb); },
        function(cb) { board.add('member6', 80, cb); },
        function(cb) { board.add('member7', 90, cb); }
      ], function() {
        board.list(function(err, list) {
          assert.equal(list.length, 5);
          done();
        });
      });
    });

    it('should return correct number of entries for the page 1', function(done) {
      var board = new LB('general', {pageSize: 5}, {db: DBINDEX});
      
      board.list(1, function(err, list) {
        assert.equal(list.length, 2);
        done();
      });
    });

  });

  describe('"score" method', function() {
    // Empty database before the suite
    before(function(done) {
      this.client.flushdb(done);
    });
    
    it('should return correct score #1', function(done) {
      var board = this.board;
      board.add('member1', 50, function() {
        board.score('member1', function(err, score) {
          assert.deepEqual(score, 50);
          done();
        });
      });
    });

    it('should return correct score #2', function(done) {
      var board = this.board;
      board.add('member2', 100, function() {
        board.score('member2', function(err, score) {
          assert.deepEqual(score, 100);
          done();
        });
      });
    });

    it('should return correct score #3', function(done) {
      var board = this.board;
      board.add('member1', 150, function() {
        board.score('member1', function(err, score) {
          assert.deepEqual(score, 150);
          done();
        });
      });
    });

    it('should return -1 if member isn\'t in the leaderboard', function(done) {
      this.board.score('sosiska', function(err, score) {
        assert.deepEqual(score, -1);
        done();
      });
    });
  });

  describe('"rm" method', function() {
    // Empty database before the suite
    before(function(done) {
      this.client.flushdb(done);
    });
    
    it('should remove member from the leaderboard #1', function(done) {
      var board = this.board;

      async.parallel([
        function(cb) { board.add('member1', 10, cb); },
        function(cb) { board.add('member2', 20, cb); },
        function(cb) { board.rm('member2', cb); }
      ], function() {
        board.list(function(err, list) {
          assert.deepEqual(list, [{'member': 'member1', 'score': 10}]);
          done();
        });
      });
    });

    it('should remove member from the leaderboard #2', function(done) {
      var board = this.board;

      async.parallel([
        function(cb) { board.add('member1', 10, cb); },
        function(cb) { board.add('member2', 20, cb); },
        function(cb) { board.rm('member1', cb); }
      ], function() {
        board.rank('member1', function(err, rank) {
          assert.equal(rank, -1);
          done();
        });
      });
    });

    it('should remove member from the leaderboard #3', function(done) {
      var board = this.board;
      board.add('member1', 10, function() {
        board.rm('member1', function(err, removed) {
          assert.strictEqual(removed, true);
          done();
        });
      });
    });

    it('should remove member from the leaderboard #4', function(done) {
      var board = this.board;
      board.add('member1', 10, function() {
        board.rm('member100500', function(err, removed) {
          assert.strictEqual(removed, false);
          done();
        });
      });
    });

    it('shoud take "callback" argument as optional', function(done) {
      this.board.rm('member100');
      done();
    });

  });

  describe('Options', function() {
    // Empty database before the suite
    before(function(done) {
      this.client.flushdb(done);
    });

    describe('"pageSize"', function() {
      it('should enforce specified number of entries for a page', function(done) {
        var board = new LB('general', {pageSize: 3}, {db: DBINDEX});

        async.parallel([
          function(cb) { board.add('member1', 10, cb); },
          function(cb) { board.add('member2', 20, cb); },
          function(cb) { board.add('member3', 30, cb); },
          function(cb) { board.add('member4', 40, cb); }
        ], function() {
          board.list(function(err, list) {
            assert.equal(list.length, 3);
            done();
          });
        });
      });
    });

    describe('"reverse"', function() {
      it('should enforce "list" method return results in reverse order', function(done) {
        var board = new LB('general', {reverse: true}, {db: DBINDEX});
        board.list(function(err, list) {
          assert.deepEqual(list, [
            {'member': 'member1', 'score': 10},
            {'member': 'member2', 'score': 20},
            {'member': 'member3', 'score': 30},
            {'member': 'member4', 'score': 40}
          ]);
          done();
        });
      });

      it('should enforce "rank" method return results in reverse order', function(done) {
        var board = new LB('general', {reverse: true}, {db: DBINDEX});
        board.rank('member2', function(err, rank) {
          assert.equal(rank, 1);
          done();
        });
      });
    });

  });
});