const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const dbconnection = require('./connection.js');
const hackdoController = require('./controllers/hackdo.js');
const HomepageController = require('./controllers/homepage.js');
const FileServeController = require('./controllers/fileserve.js');
const HackdoModel = require('./model/hackdo.js');
const dispatchModel = require('./utils.js').dispatchModel;
const bodyParser = require('body-parser');
const exphbs  = require('express-handlebars');

app.use(express.static('./public'));

var hbs = exphbs.create({ 
  defaultLayout: 'main',
  extname: '.hbs'
});



app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({
  extended: true,
  limit:'50mb'
}));
app.use(bodyParser.json({limit:'50mb'}));


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
  new HomepageController(app, h4ckdo, connection);

  if(process.env.STAGING) {
    const newman = require('newman');
    newman.run({
      collection: require('./Hackdoodles.postman_collection.json'),
  	  reporters: 'cli',
      bail: true
    }, function (err) {
      if (err) { 
        throw err; 
        process.exit(1);
      } else {
    	  console.log('collection run complete!');
        process.exit(0);        
      }
  	});    
  }

})


server.listen(process.env.PORT  || 3000,()=> console.log("listen at: 3000"));
