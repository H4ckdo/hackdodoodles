const _ = require('lodash');

module.exports = {
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
    const badRequest = _.extend({details: `Bad request`, status: 400}, options.errors.badRequest);
    const conflict = _.extend({status: 409, details: `Resource in conflict`}, options.errors.conflict);
    const notAllow = _.extend({status: 405, details: `Action not allow`}, options.errors.notAllow);

    let remove = function(omits = [], elements, unless = []) {
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
            remove(omits, x, unless);
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
    }//end remove


    return (
  		Query.then((docs)=> {
        let response = {
          data: docs || {},
          status: options.success.status || 200
        };
        if(options.success.details) response.details = options.success.details;
        options.success.model = options.success.model || Object;

        let isMongooseDocument = response.data instanceof options.success.model;
        if(_.isArray(response.data)) isMongooseDocument = response.data[0] instanceof options.success.model;
        console.log(response, 'response');

        if(isMongooseDocument) {
          let options = {getters: true};
          if(_.isArray(response.data)) {
            response.data = _.map(response.data,doc => doc.toObject(options));             
          } else {
            if(Object.keys(response.data).length != 0 && response.data.toObject) {
              response.data = response.data.toObject(options);
            }
          }
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
              response.data = tmpPick;
            }
          };//end if pick

          if(options.success.hasOwnProperty('omit')) {
            if(_.isArray(response.data)) {
              remove(options.success.omit, response.data, options.success.omit.unless);
            } else {
              _.each(options.success.omit, (omit)=> delete response['data'][omit]);
            }
          };//end if omit

          if(options.success.hasOwnProperty('map')) {
            if(_.isArray(response.data)) {
              response.data = response.data.map(options.success.map);
            } else {
              response.data = [response.data].map(options.success.map)[0];
            }
          };//end if map



          res.status(options.success.status || 200);
          if(options.success.hasOwnProperty('view')) {
            let data = _.extend(options.success.data || {}, response.data);
            res.render(options.success.view, {data});
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
          if(options.errors.hasOwnProperty('notFound') && options.errors.notFound.hasOwnProperty('view')) return res.render(options.errors.notFound.view, {data: response.error});
          res.status(404);
          res.json({error: notFound});
        }
    	})
    	.catch(function(err) {
        console.log(err)
        const response = {data: null};
        if(err.code === 11000 || (err.hasOwnProperty('originalError') && err.originalError.code === 11000)) {
          _.extend(response, {error: conflict});
          if(options.errors.conflict.hasOwnProperty('view')) return res.render(options.error.conflict.view, {data: response.error});//Render view in case of error
          res.status(409);
          return res.json(response);
          /*
            Response in case of resource conflict
          */
        }

        if(err.message === "successButNotFound") {
          _.extend(response, {error: options.success.notFound, status: 404});
          if(options.success.notFound.hasOwnProperty('view')) return res.render(options.success.notFound.view, {data: response.error});//Render view in case of error
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
          if(options.errors.badRequest.hasOwnProperty('view')) return res.render(options.errors.badRequest.view, {data: response.error});//Render view in case of error
          return res.json(response);
          /*
            Response in case of badRequest
          */
        }

        if(err.message === "forbidden" || err.invalidAttributes) {
          _.extend(response, {error: forbidden});
          res.status(403);
          if(options.errors.forbidden.hasOwnProperty('view')) return res.render(options.errors.forbidden.view, {data: response.error});//Render view in case of error
          return res.json(response);
          /*
            Response in case of forbidden
          */
        }

        if(err.message === "notAllow") {
          delete response.data;
          _.extend(response, {error: notAllow});
          //TODO MAKE A VIEW OPTION WHEN NOT ALLOW
          if(options.errors.notAllow.hasOwnProperty('view')) return res.render(options.errors.notAllow.view,{data: response.error});//Render view in case of error
          res.status(405);
          return res.json(response);
          /*
            Response in case of notAllow
          */
        }


        if(err.message === "serverError") {
          _.extend(response, {error: serverError});
          res.status(500);
          if(options.errors.serverError.hasOwnProperty('view')) return res.render(options.errors.serverError.view, {data: response.error});//Render view in case of error
          return res.json(response);
          /*
            Response in case of serverError
          */
        }

        if(options.errors.hasOwnProperty("otherwise") && options.errors.otherwise.hasOwnProperty(err.message)) {
          let custom = options.errors.otherwise[err.message];
          _.extend(response, {error: custom});
          if(custom.hasOwnProperty('view')) return res.render(custom.view,{data: response.error});//Render view in case of error
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
