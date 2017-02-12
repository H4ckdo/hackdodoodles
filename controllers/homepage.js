const path = "/";

module.exports = class HomepageController {
  constructor(app, HackdoModel, connection) {
    this.HackdoModel = HackdoModel;
    app.route(`${path}`).get(this.show.bind(this));//show
  }

  show(req, res) {
    let HackdoModel = this.HackdoModel;
    let responseCases = {
      success: {
        view: "homepage.hbs",
        model: HackdoModel,
        map: document => {
          let date = document.createAt;
          let year = date.getFullYear();
          let month = date.getMonth()+1;
          let dt = date.getDate();

          if (dt < 10) {
            dt = '0' + dt;
          }
          if (month < 10) {
            month = '0' + month;
          }          
          document.createAt = year+'-' + month + '-'+dt;
          return document;
        }
      }
    };
    res.dispatchModel(HackdoModel.find({}), responseCases);
  }
};
