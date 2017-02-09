const _ = require('lodash');

module.exports = {
  remove: function(omits = [], elements, unless = []) {
    for(var i = 0; i < elements.length; i++) {
      let current = elements[i];
      let deep = Object.keys(current);
      for(var e = 0; e < deep.length; e++) {
        let stop = false;
        for (var l = 0; l < unless.length; l++) {
          if(unless[l] === deep[e]) {
            stop = true;
            break
          }
        }
        if(stop) continue;
        let x = current[deep[e]];
        if(_.isArray(x)) {
          this.remove(omits, x, unless);
        } else {
          for(var t = 0; t < omits.length; t++) {
            delete current[omits[t]]
          }
        }
      }
    }
    /*
      @params
        *omits<default Array>: Represent an array of object that whant to remove
        *elements<Array>: Represent an array of object over gonna be keys deleted in case that key was in the omits argument
        unless<Array>: Represent an array of object which have specifics
      Description: `Recursive function that delete the elements of a object even if is deep in the object`
      Return<undefined>
    */
  },//end remove

  dispatchModel: function(Query, options = {}) {
    let req = this.req;
    let res = this;
    options.success = options.success || {};
    options.errors = options.errors || {};
    options.errors.notFound = options.errors.notFound || {};
    options.errors.serverError = options.errors.serverError || {};
    options.errors.forbidden = options.errors.forbidden || {};
    options.errors.badRequest = options.errors.badRequest || {};
    options.errors.conflict = options.errors.conflict || {};
    options.errors.notAllow = options.errors.notAllow || {};

    const notFound = _.extend({details: `Resource not found.`, status: 404}, options.errors.notFound);
    const serverError = _.extend({details: `Internal server error.`, status: 500}, options.errors.serverError);
    const forbidden = _.extend({details: `Action forbidden.`, status: 403}, options.errors.forbidden);
    const badRequest = _.extend({details: `Bad request`, status: 400}, options.errors.badRequest || {});
    const conflict = _.extend({status: 409, details: `Resource in conflict`}, options.errors.conflict);
    const notAllow = _.extend({status: 405, details: `Action not allow`}, options.errors.notAllow);

    return (
  		Query.then(function(docs) {
        let response = {
          data: docs,
          status: options.success.status || 200
        };

        if(docs) {
          const saveId = docs.id;
          const saveRol = docs.rol;
          if(options.success.hasOwnProperty('pick')) {
            let picks = [];
            let tmpPick = {};
            /*
              Pick a few attributes of query response
            */
            if(_.isArray(response.data)) {
              //In case that response have multiples objects
              if(response.data.length) {
                _.each(options.success.pick, (pick)=> {
                  _.each(response.data, (doc)=> {
                    if(doc[pick]){
                      tmpPick[pick] = doc[pick];
                      //tmpPick.deletedAt = new Date();
                    }
                  });
                });
                picks.push(tmpPick);
                response.data = picks;
              }
            } else {
              //In case that response have a single objects
              _.each(options.success.pick, (pick)=> {             
                if(response.data[pick]) {
                  tmpPick[pick] = response.data[pick];
                }
              });
  //            tmpPick.deletedAt = new Date();
              response.data = tmpPick;
            }
          };
          
          if(options.success.hasOwnProperty('omit')) {
            if(_.isArray(response.data)) {
              this.remove(options.success.omit || [], response.data, options.success.omit.unless);
            } else {
              _.each(options.success.omit || [], (to_omit)=> delete response['data'][to_omit]);
            }
          };
          res.status(options.success.status || 200);
          if(options.success.hasOwnProperty('view')) {
            let info = _.extend(options.success.data || {}, response.data);
            res.render(options.success.view, info);
          } else {
            if(options.success.hasOwnProperty('notFound') && (response.data.length === 0 || response.data === null)) throw new Error("successButNotFound");
            if(options.success.authentication === true) {
              req.session.userId = saveId;
              req.session.authenticated = true;
              //req.session.rol = saveRol;
              req.session.save((err)=> {
                if(err) throw new Error("serverError");
                res.json(response);
              });
            } else {
             res.json(response);
            }
          }
        } else {
          if(options.errors.hasOwnProperty('notFound') && options.errors.notFound.hasOwnProperty('view')) return res.render(options.errors.notFound.view, response.data);
          res.status(404);
          res.json({error: notFound});
        }
    	})
    	.catch(function(err) {
        const response = {data: null};
        if(err.code === 11000 || (err.hasOwnProperty('originalError') && err.originalError.code === 11000)) {
          _.extend(response, {error: conflict});
          res.status(409);
          return res.json(response);
          /*
            Response in case of resource conflict
          */
        }

        if(err.message === "successButNotFound") {
          _.extend(response, {error: options.success.notFound, status: 404});
          if(options.success.notFound.hasOwnProperty('view')) return res.json(options.success.notFound.view, response.error);//Render view in case of error
          res.status(404)
          return res.json(response);
          /*
            Response in case of notFound
          */
        }

        if(err.message === "notFound") {
          _.extend(response, {error: notFound});
          if(options.errors.notFound.hasOwnProperty('view')) return res.json(options.errors.notFound.view, response.error);//Render view in case of error
          res.status(404);
          return res.json(response);
          /*
            Response in case of notFound
          */
        }

        if(err.message === "badRequest") {
          _.extend(response, {error: badRequest});
          res.status(400);
          if(options.errors.badRequest.hasOwnProperty('view')) return res.json(options.errors.badRequest.view, response.error);//Render view in case of error
          return res.json(response);
          /*
            Response in case of badRequest
          */
        }

        if(err.message === "forbidden" || err.invalidAttributes) {
          _.extend(response, {error: forbidden});
          res.status(403);
          if(options.errors.forbidden.hasOwnProperty('view')) return res.json(options.errors.forbidden.view, response.error);//Render view in case of error
          return res.json(response);
          /*
            Response in case of forbidden
          */
        }

        if(err.message === "notAllow") {
          delete response.data;
          _.extend(response, {error: notAllow});
          //TODO MAKE A VIEW OPTION WHEN NOT ALLOW
  //        if(options.errors.notAllow.hasOwnProperty('view')) return res.notAllow(options.errors.notAllow.view, response.error);//Render view in case of error
          res.status(405);
          return res.json(response);
          /*
            Response in case of notAllow
          */
        }


        if(err.message === "serverError") {
          _.extend(response, {error: serverError});
          res.status(500);
          if(options.errors.serverError.hasOwnProperty('view')) return res.json(options.errors.serverError.view, response.error);//Render view in case of error
          return res.json(response);
          /*
            Response in case of serverError
          */
        }

        if(options.errors.hasOwnProperty("otherwise") && options.errors.otherwise.hasOwnProperty(err.message)) {
          let custom = options.errors.otherwise[err.message];
          _.extend(response, {error: custom});
          if(custom.hasOwnProperty('view')) return res.json(custom.view, response.error);//Render view in case of error
          res.status(custom.status || 500);
          return res.json(response);
          /*
            Custom error
          */
        }

        /*
          Response with json format
        */
        res.status(204);
        return res.json(response);
    	})
    )
      /*
        @params
          *Query<Promise>: Promise to execute
           options<Object>: Options that use to response depend of result
        Description: `Execute a Query and response depend of @options or not`
        Return<Promise>
      */
  }//end dispatch model
};
