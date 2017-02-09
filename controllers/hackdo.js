const path = "/api/v1/hackdoodles";
const multer = require('multer');
const mongoose = require('mongoose');

class HackdoController {
  constructor(app, HackdoModel, connection) {
    this.HackdoModel = HackdoModel;
    this.gfs = connection.gfs;
    let upload = multer();
    app.route(`${path}/create`).post(
      upload.single('imagen'),
      this.create.bind(this)
    );//create

    app.route(`${path}/update/:id`).put(this.update.bind(this));//update
    app.route(`${path}/:id`).get(this.show.bind(this));//show
    app.route(`${path}`).get(this.showAll.bind(this));//showAll
    app.route(`${path}/delete/:id`).delete(this.delete.bind(this));//delete
  }//end contructor

  showAll(req, res) {  
    res.dispatchModel(this.HackdoModel.find({}));
  }//end showAll

  show(req, res) {    
    let _id = req.params.id;
    res.dispatchModel(this.HackdoModel.findOne({_id}));
  }//end show

  create(req, res) {
    let file = req.file;
    if(!file) return res.json({
      status: 400,
      message: "Dont match any file with field name: imagen, checked or delete cache and try again"
    })

    let stream = this.gfs.createWriteStream({
      filename: file.originalname,
      mode: "w",
      chunkSize: 1024*4,
      content_type: file.mimetype,
      root: "fs"
    });
    req.body.ref = stream.id;
    req.body.mimetype = stream.options.content_type;

    let hackdo = new this.HackdoModel(req.body);
    res.dispatchModel(hackdo.save().then(docs => {
      stream.write(file.buffer);
      stream.end();  
      return docs;
    }),{
      success: {
        status: 201
      }
    });      
  }//end create

  update(req, res) {
    let _id = req.params.id;
    let update = req.body;
    res.dispatchModel(this.HackdoModel.where({_id}).findOneAndUpdate(update).then(docs => docs ? update : docs));
  }//end update

  delete(req, res) {
    let _id = req.params.id;
    res.dispatchModel(
      new Promise((resolve, reject)=> {
        this.HackdoModel.findOne({_id}).then(docs => {
          if(docs) {
            let ref = docs.ref;
            this.gfs.remove({
              _id: ref
              },(err)=> {
                if(err) return reject(new Error('serverError'));
                docs.remove((err)=> err ? reject(new Error('serverError')) :  resolve({message: "resource removed"}));
              });  
          } else {
            reject(new Error('notFound'));
          }         
        })
        .catch(reject)
      })
    );
  }//end delete
}

module.exports = HackdoController;