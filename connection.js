const development = require("./env/development.js"); 
const production = require("./env/production.js"); 
const mongoose = require('mongoose');
const URI = production.MONGO_URI || development.MONGO_URI;
const Grid = require('gridfs-stream');
mongoose.Promise = require('bluebird');

module.exports = function connection(app, cb) {
  var connection = mongoose.connect(URI);
  if(development.collectionsDrop) {
    mongoose.connection.dropDatabase();   
  };

  mongoose.connection.once('open', function() {
    mongoose.gfs = Grid(mongoose.connection.db, mongoose.mongo);
    cb(null, mongoose);    
  });

};
