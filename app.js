const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const dbconnection = require('./connection.js');
const hackdoController = require('./controllers/hackdo.js');
const FileServeController = require('./controllers/fileserve.js');
const HackdoModel = require('./model/hackdo.js');
const dispatchModel = require('./utils.js').dispatchModel;
const bodyParser = require('body-parser');
const newman = require('newman');

app.use(express.static('./public'));

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());


app.use("*",(req, res, next)=> { 
  res.dispatchModel = dispatchModel; 
  next(); 
});

dbconnection(app, function(err, connection) {
  if(err) throw err;
  console.log("connection open")
  let h4ckdo = HackdoModel(connection);
  new hackdoController(app, h4ckdo, connection);
  new FileServeController(app, h4ckdo, connection);
  if(process.env.STAGING) {
    newman.run({
      collection: require('./Hackdoodles.postman_collection.json'),
  	  reporters: 'cli',
      bail: true
    }, function (err) {
      if (err) { throw err; }
  	  console.log('collection run complete!');
      process.exit(0);
  	});    
  }

})


server.listen(3000,()=> console.log("listen at: 3000"));
