const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

const HackdoSchema = new Schema({
  name: {
    type: String,
    required: true,
    index: { unique: true },
  },  
  createAt : {
    type: Date,
    default: new Date()
  },
  mimetype: {
    type: String
  },
  ref: {
    type: String
  },
  description: {
    type: String,
    default: ''
  }
});

HackdoSchema.methods.insert = function() {
  return (
    new Promise((resolve, reject)=> {
      let save = this.save();    
      save.then(function(docs) {
        console.log('docs', docs);
        resolve(docs);
      })
      .catch((err)=> {
        if(err.name === "ValidationError") return reject(new Error("badRequest"))
        console.error(`ERROR AT: ${__dirname}`, err);
        reject(new Error("serverError"));
      });
    })//end promise
  )
}//end insert


module.exports = function(connection) {
  return connection.model("hackdo", HackdoSchema);
};
