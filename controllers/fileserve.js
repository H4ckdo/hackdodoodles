const path = "/fs/download/:ref";

class FileServeController {
  constructor(app, HackdoModel, connection) {
    this.gfs = connection.gfs;
    this.HackdoModel = HackdoModel;
    app.route(`${path}`).get(this.serve.bind(this));//serve image
  }  

  serve(req, res) {    
    let ref = req.params.ref;
    let image = this.HackdoModel.findOne({ref})
    image.then(docs => {
      if(docs) {    
        res.type(docs.mimetype);
        var readstream = this.gfs.createReadStream({_id: ref});
        readstream.pipe(res);
      } else {
        res.status(404);          
        res.json({message:"resource not found", status: 404});
      }
    })
    .catch(err => {
      res.status(500);
      res.json({message:"server error", status: 500})
    })
  }
};

module.exports = FileServeController;
