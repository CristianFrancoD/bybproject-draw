var express = require("express");
var http = require("http");
var ConnectRoles = require("connect-roles");
var flash = require('connect-flash');
var passport = require("passport"),
  LocalStrategy = require("passport-local").Strategy;
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server)
var historias = [];
var releaseBacklog = [];
var sprints = {};
var bodyParser = require("body-parser");
var Usuario = require("./models/usuarios").Usuario;
var Backlog = require("./models/usuarios").Backlog;
var Proyecto = require("./models/usuarios").Proyecto;
var Sprint = require("./models/usuarios").Sprint;
var Release = require("./models/usuarios").Release;
var session = require("express-session");
var FacebookStrategy = require("passport-facebook").Strategy;
var TwitterStrategy = require("passport-twitter").Strategy;
var GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

app.set("view engine","jade");

var user = new ConnectRoles({
  failureHandler: function (req,res,action){
    res.status(403);
    res.render("forbidden");
  }
});

// Se le indica a express que se debe utilizar el directorio public.
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({

secret: "fc47873566a1da7c3ca94ecccba88241",
resave: false,
saveUninitialized:false
}));

app.use(user.middleware());
app.use(passport.initialize());
app.use(flash());




io.on('connect',function(socket){
  console.log("Se conecto");

  socket.on("mensajeNuevo",function(data){
    historias.push(data);
    io.sockets.emit("enviarMensajes",historias)
  })
  socket.on("editBacklog",function(data){
    for(var item in historias){
      if(historias[item]._id==data._id){
        historias.splice(item,1,data)
      }
    }
    io.sockets.emit("enviarMensajes",historias)
  })
  socket.on("backlogAccepted",function(data) {
      releaseBacklog.push(data);
      io.sockets.emit("agregarRelease",releaseBacklog);
  })
  socket.on("newSprint",function(data) {
      sprints = data;
      io.sockets.emit("agregarSprint",sprints);

  })
  socket.on("newSprintToRelease",function(data) {
      var nuevoSprint = true;
      console.log("SprintToRelease");
      console.log(data);
      for(var val in releaseBacklog){
        if(releaseBacklog[val]._id==data._id){
          nuevoSprint = false;
          releaseBacklog.splice(val,1,data);
          break;
        }
      }
      if(nuevoSprint){
        releaseBacklog.push(data);
      }

      io.sockets.emit("agregarRelease",releaseBacklog);
  })
  socket.emit("enviarMensajes",historias);
  socket.emit("agregarRelease",releaseBacklog);
  socket.emit("agregarSprint",sprints);
})


passport.use(new FacebookStrategy({
  clientID:1693257597605353,
  clientSecret:"26006323ce0decde6b947789d2dc3910",
  //Local URL
  //callbackURL:"https://bybproyecttest-carlossn.c9users.io/auth/facebook/callback",
  //DEPLOY URL
  callbackURL:"https://bybproyectcarlos.herokuapp.com/auth/facebook/callback",
  profileFields:['id','name','email']
},function(accessToken,refreshToken,profile,done){

  Usuario.findOne({email:profile.emails[0].value},function(err,user) {
    if(err)throw(err);
    if(!err && user!=null) return done(null,user);
    console.log("Verificando credenciales");
    var newUser = new Usuario({
      nombre:profile._json.first_name,
      apellidoP:profile._json.last_name,
      email:profile.emails[0].value
    })
    newUser.save(function(err){
      if(err){
        throw(err);
      } else{
        console.log("Se guardo usuario de FB");
        return done(null,user);
      }

    })
  })
}
));

passport.use(new TwitterStrategy({
  consumerKey:"W9JJCsHAXnkHQWMngJEpwp616",
  consumerSecret:"PYRQue4X79i31vNwodQ7nMfXHcZPRTkOlwzUr3OpmodJ7IvxAG",
  //Local URL
  //callbackURL:"https://bybproyecttest-carlossn.c9users.io/auth/twitter/callback",
  //DEPLOY URL
  callbackURL:"https://bybproyectcarlos.herokuapp.com/auth/twitter/callback"

},function(accessToken,refreshToken,profile,done){
  var email = profile.username+"@gmail.com";
  var fullName = profile.displayName.split(" ");
  var first_name = fullName[0];
  var last_name = fullName[1];
  console.log()
  Usuario.findOne({email:email},function(err,user){
    if(err)throw(err);
    if(!err && user!=null) return done(null,user);
        var newUser = new Usuario({
      nombre:first_name,
      apellidoP:last_name,
      email:email
    })
    newUser.save(function(err){
      if(err){
        throw(err);
      } else{
        console.log("Se guardo usuario de Twitter");
        return done(null,user);
      }
    })
  })
}
));

passport.use(new GoogleStrategy({
        clientID        : "575938905641-o0dbccqtl9sn580ag7invltuu5p71u5s.apps.googleusercontent.com",
        clientSecret    : "HnlV_zKNde9CTGhyTRmo-pgO",
        //Deploy
        callbackURL     : "https://bybproyectcarlos.herokuapp.com/auth/google/callback"
        //Local
        //callbackURL     : "https://bybproyecttest-carlossn.c9users.io/auth/google/callback",

    },
    function(token, refreshToken, profile, done) {
      console.log(profile.emails[0].value);
        Usuario.findOne({email:profile.emails[0].value},function(err, user) {
            if(err) throw(err);
            if(!err && user!=null) return done(null,user);

            var newUser = Usuario({
              nombre:profile.name.givenName,
              apellidoP:profile.name.familyName,
              email:profile.emails[0].value
            })
            newUser.save(function(err){
              if(err)throw(err);
              console.log("Se agrego usuario de Google+")
              return done(null,user);
            })
        })
}
))


passport.use(new LocalStrategy({
  usernameField : 'email',
  passwordField : 'contra'
},
  function(username, password, done) {
    Usuario.findOne({$and:[{email: username },{contrasena:password}]}, function(err, user) {
      if (err) { return done(err); }
      if (!user) {
        console.log("usuario no valido");
        return done(null, false, { message: 'Usuario/contraseña no validos.' });
      }
      console.log("usuario valido");
      return done(null, user);
    });
  }
));

user.use("anonymousUser",function(req) {
    if(req.session.hasOwnProperty("user")){
      console.log("No es anonimo");
    return true;
    }
})


user.use("scrum-master",function(req){
  console.log(req.session.user);

    if(req.session.rol ==='scrum master'){
      console.log("entro scrum");
    return true;



  }
})

user.use("product-owner",function(req){
  console.log(req.session.user);

    if(req.session.rol ==='product owner'){
      console.log("entro");
    return true;
    }

})

user.use("desarrollador",function(req){
  console.log("Entro en funcion desarrollador")
    console.log(req.session.user);

    if(req.session.rol ==='desarrollador'){
      console.log("entro developer");
      return true;
  }

})

app.get('/auth/facebook', passport.authenticate('facebook',{ scope: [ 'email' ] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook',
  {
    failureRedirect: '/login' ,
     scope: [ 'email' ] ,
     session:false
  }),function(req,res){
    console.log(req.user);
    req.session.user = req.user._id;
    res.redirect("/dashboard");
  });

  app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback', passport.authenticate('twitter',
  {
    failureRedirect: '/login' ,
    session:false
  }),function(req,res){
    req.session.user = req.user._id;
    res.redirect("/dashboard");
  });

 app.get('/auth/google', passport.authenticate('google',{scope:['profile','email']}));
app.get('/auth/google/callback', passport.authenticate('google',
  {
    failureRedirect: '/login' ,
    session:false
  }),function(req,res){
    req.session.user = req.user._id;
    res.redirect("/dashboard");
  });

app.get("/",function(req, res){
  res.render("landing");

});



app.get("/login",function(req, res) {
  res.render("login");

});

app.get("/about", function(req, res) {
  res.render("about");
});

app.get("/signup",function(req, res) {
  res.render("signup");


});

app.get("/profile",user.can("anonymousUser"),function(req,res){

  console.log("Perfil del usuario");
    Usuario.findOne({_id:req.session.user},function(err, user) {
        if(err) throw err;
        console.log("Se encontro usuario");
        console.log(user);
        res.render("profile",{user:user});
    })

});

// Se redireciona al Dashboard.


app.get("/dashboard",user.can("anonymousUser"), function(req, res) {
  console.log("Entro a dashboard");
  Proyecto.count({$or:[{proyectManager:req.session.user},{equipoInvolucdrado:req.session.user},{productOwner:req.session.user}]},function(err,count){
    if(err)console.log(String(err));
    if(count!=0){
      console.log("Numero de proyectos",count);

       res.redirect(301,"/simple-cards");
       console.log(res.statusCode);

    }else{
      console.log("No tiene registrados proyectos");
      res.render("layout");
    }
  })
});



app.get("/api/proyectos",user.can("anonymousUser"),function(req, res) {
     Proyecto
     .find({proyectManager:req.session.user})
    .exec(function (err, usuario) {
  if (err) console.log(String(err));

  console.log(usuario);
  res.json(usuario);
});
})

app.post("/api/saveSkills",function(req, res) {
  console.log("Guardando habilidades");
  console.log(req.body)
    Usuario.findOne({_id:req.session.user},function(err,doc){
      if(err)throw err;
      for(var item in req.body){
        Usuario.findByIdAndUpdate({_id:req.session.user},{$push:{habilidades:req.body[item]}},function(err, user) {
            if(err)throw err;
        })
      }
      res.json(doc);
    })
})

app.post("/api/historyToSprint/:idSprint",function(req, res) {
    console.log("Mandando tarjeta al Sprint");
    console.log(req.body);
    Sprint.findOneAndUpdate({$and:[{idSprint:req.params.idSprint},{mandadaAlRelease:false}]},{$push:{backlog:req.body._id}},function(err,doc){
      if(err)console.log(String(err));
      console.log(doc);
    })
    Sprint.findOne({$and:[{idSprint:req.params.idSprint},{mandadaAlRelease:false}]})
    .populate('backlog')
    .exec(function(err,sprint){
      if(err) console.log(err);
      res.json(sprint);
    })
})

app.get("/proyect",user.can("anonymousUser"),user.can("product-owner"),function(req, res){
    res.render("proyects");
});

app.get("/productBacklog",user.can("anonymousUser"),function(req,res){

    res.render("prodBacklog");


});

app.get("/api/simple-cards",user.can("anonymousUser"),function(req,res){

})

app.get("/simple-cards",user.can("anonymousUser"),function(req,res){
   var data = [];
    Proyecto
      .find({$or:[{proyectManager:req.session.user},{equipoInvolucdrado:req.session.user},{productOwner:req.session.user}]})
      .populate('proyectManager')
      .populate('equipoInvolucdrado')
      .populate('productOwner')
      .exec(function (err, proyecto) {
      if (err) console.log(String(err));
        console.log("ALTO");
        console.log(proyecto);
        for(var val in proyecto) {
           data.push(proyecto[val])

        }

       res.render("home/simple-cards",{
        proyecto:data,
        usuarioActual:req.session.user
      });
})
})



app.get("/editProfile",user.can("anonymousUser"),function(req,res){

    res.render("editProfile");


});

app.get("/api/releaseBacklog/:idProy",function(req, res) {
    console.log(req.params.idProy);
    Release
    .find({proyecto:req.params.idProy})
    .populate('proyecto')
    .populate('sprints')
    .populate({
      path:'sprints',
      // Se obtiene los backlogs completos de cada sprint
      populate:{path:'backlog'}
    })
    .exec(function(err,release){
      if(err)console.log(err);
      releaseBacklog = release;
      res.json(release)
    })
})
app.get("/api/sprints/:idProy",function(req, res) {
    console.log(req.params.idProy);
    Sprint
    .findOne({$and:[{proyecto:req.params.idProy},{mandadaAlRelease:false}]})
    .populate('backlog')
    .exec(function(err, sprint) {
        if(err)console.log(String(err));
        sprints = sprint;
        console.log("Buscando sprint");
        console.log(sprint);
        res.json(sprint);
    })
})
app.get("/api/backlog/:idProy",function(req, res) {
  console.log(req.params.idProy)
  var data = [];
      Backlog
    .find({proyectos:req.params.idProy})
    .populate('proyectos')
    .exec(function (err, backlog) {
    if (err) console.log(String(err));
      console.log("Buscando backlog");
      console.log(backlog);
      for(var val in backlog) {
         data.push(backlog[val])
      }
      historias = backlog;
      res.json(data);
});
})
app.post("/api/saveSprint/:idSprint",function(req, res) {
    Sprint.findOneAndUpdate({_id:req.params.idSprint},{aprobado:true},function(err, doc) {
        if(err)console.log(err);
        console.log(doc);
        Release
        .findOne({proyecto:doc.proyecto})
        .populate('proyecto')
        .populate('sprints')
        .populate({
        path:'sprints',
        // Se obtiene los backlogs completos de cada sprint
        populate:{path:'backlog'}
        })
        .exec(function(err,release){
          if(err)console.log(err);
          res.json(release)
        })
    })

})
app.post("/api/crearSprint/:idProy",function(req, res) {
    console.log(req.body);
    var newSprint = new Sprint ({
      idSprint:req.body.idSprint,
      tamanioSprint:req.body.tamanioSprint,
      backlog:[],
      proyecto:req.params.idProy,
      mandadaAlRelease:false,
      aprobado:false
    })
    newSprint.save().then(function(doc){
      res.json(doc);
    },function(err){
      console.log(String(err));
    });

})

app.get("/backlog/:idProy",user.can("anonymousUser"),function(req,res){
  console.log("Entro al backlog")
  var cierreProyecto;
  var hayProductOwner;
   Proyecto.findOne({ _id:req.params.idProy }, function (err, estado) {
   if (err) return handleError(err);
   console.log("El estado de su proyecto es: ");
   console.log(estado.estadoProyecto);
   cierreProyecto = estado.estadoProyecto;
 })
  Proyecto.count({$and:[{_id:req.params.idProy},{productOwner:req.session.user}]},function(error,count){
     if (count == 0) {
          hayProductOwner = false
        }
        else {
          hayProductOwner = true;
        }
        console.log(count);
      })
var data = [];
  Backlog
    .find()
    .populate('proyectos')
    .exec(function (err, backlog) {
    if (err) console.log(String(err));
      console.log("Buscando backlog");
      //console.log(backlog);
      for(var val in backlog) {
         data.push(backlog[val])
      }
    res.render("backlog",{
      idProy:req.params.idProy,
      hayProductOwner:hayProductOwner,
      cierreProyecto:cierreProyecto
    });
});
});

app.get("/backlog",user.can("anonymousUser"),function(req,res){

    res.render("backlog");

});

app.post("/api/editbacklog",function(req, res){
console.log("El id de la tarjeta a editar es: ",req.body._id);
var nuevosDatos = {
como: req.body.como,
detalmanera: req.body.detalmanera,
quiero: req.body.quiero,
creadorTarjeta: req.body.creadorTarjeta,
narrativa: req.body.narrativa,
prioridad: req.body.prioridad,
tamanio: req.body.tamanio
}
console.log(nuevosDatos);
Backlog.findOneAndUpdate({_id:req.body._id}, nuevosDatos, {upsert:true}, function(err, doc){
    if (err)console.log(String(err));
    console.log(doc)
    res.json(doc);
});
});

app.post("/api/userHistoryState/:idBacklog",function(req, res) {
    Backlog.findOneAndUpdate({_id:req.params.idBacklog},{estado:!req.body.estado},{'new':true},function(err,updated){
      if(err) console.log(String(err));
      console.log("Backlog agregado a Release");
      console.log(updated);
      res.json(updated);
    })
})
app.post("/api/sprintState",function(req, res) {
    Sprint.findOneAndUpdate({_id:req.body._id},{mandadaAlRelease:true},{'new':true},function(err,updated){
      if(err) console.log(String(err));
      res.json(updated)
    })
})
app.post("/api/SprintToRelease",function(req, res) {
    console.log("Enviando al Release");
    Release.count({proyecto:req.body.proyecto},function(err,count){
      if(err)console.log(err);
      if(count==0){
        console.log(req.body);
        var newRelease = new Release({
          sprints:req.body._id,
          proyecto:req.body.proyecto
        });
      newRelease.save().then(function(doc){
        console.log("Se creo nuevo Release");
        console.log(doc);
        Release
        .findOne({_id:doc._id})
        .populate('proyecto')
        .populate('sprints')
        .populate({
        path:'sprints',
        // Se obtiene los backlogs completos de cada sprint
        populate:{path:'backlog'}
        })
        .exec(function(err,release){
          if(err)console.log(err);
          res.json(release)
        })

      },function(err){
        console.log(String(err));
    })
      }else{
        Release.findOneAndUpdate({proyecto:req.body.proyecto},{$push:{sprints:req.body._id}},{'new':true},function(err,updated){
         if(err) console.log(String(err));
          console.log("Se actualizo Release");
          Release
        .findOne({_id:updated._id})
        .populate('proyecto')
        .populate('sprints')
        .populate({
        path:'sprints',
        // Se obtiene los backlogs completos de cada sprint
        populate:{path:'backlog'}
        })
        .exec(function(err,release){
          if(err)console.log(err);
          res.json(release)
        })
        })
      }
    })

})
app.post("/api/backlogAccepted",function(req, res) {
    console.log(req.body)
    Backlog.findOneAndUpdate({_id:req.body._id},{estadoAprobadaRechazada:req.body.estadoAprobadaRechazada},{'new':true},function(err, doc) {
        if(err)console.log(String(err));
        console.log(doc);
        res.json(doc);
    })
})
app.post("/api/backlogRejected",function(req, res) {
    console.log(req.body)
    var idBacklog = req.body.idBacklog;

  Sprint.findOne({_id:req.body.idSprint},function(err, doc) {
      if(err)console.log(err);
      console.log("Eliminando backlog de Sprint")
      console.log(idBacklog)
      for(var item in doc.backlog){
        if(doc.backlog[item]==idBacklog){
          doc.backlog.splice(item,1);
          break;
        }
      }
      console.log(doc.backlog)
    Sprint.findOneAndUpdate({_id:doc._id},doc,function(err, updated) {
        if(err)console.log(String(err));
        console.log("Nuevo Sprint");
        console.log(updated);
    })
       Release
      .findOne({proyecto:doc.proyecto})
      .populate('proyecto')
      .populate('sprints')
      .populate({
      path:'sprints',
      // Se obtiene los backlogs completos de cada sprint
      populate:{path:'backlog'}
    })
    .exec(function(err,release){
      if(err)console.log(err);
      res.json(release)
    })
  })

})
app.post("/cerrarProyecto/:idProy",function(req,res){
   console.log(req.params.idProy);
   Proyecto.findOneAndUpdate({_id:req.params.idProy},{estadoProyecto:true},function(err,updated){
     if(err) console.log(String(err));
     console.log("El proyecto fue cerrado");
     console.log(updated);
       res.redirect("/dashboard");
  })


 });
app.post("/api/backlog/:idProy",function(req,res){
  console.log(req.params.idProy);
  /*res.render("backlog",{
    idProy:req.params.idProy
  });*/
  var backlog = new Backlog({

como: req.body.como,
detalmanera: req.body.detalmanera,
quiero: req.body.quiero,
creadorTarjeta: req.body.creadorTarjeta,
narrativa: req.body.narrativa,
proyectos: req.params.idProy,
prioridad: req.body.prioridad,
tamanio: req.body.tamanio,
criteriosAceptacion: req.body.criteriosAceptacion,
dado: req.body.dado,
cuando: req.body.cuando,
entonces: req.body.entonces,
estado:false,
estadoAprobadaRechazada:"pendiente"

});
backlog.save().then(function(us){
res.json(us)
console.log("Se guardo el backlog");
console.log(us)

},function(err){

  console.log(String(err));
  console.log("Hubo un error al guarda el backlog")

});

});

app.post("/signup", function(req,res){

var usuario = new Usuario({
nombre: req.body.nombre,
apellidoP: req.body.apellidoP,
apellidoM: req.body.apellidoM,
email: req.body.email,
contrasena: req.body.contra,
curp: req.body.curp,
rfc: req.body.rfc,
domicilio: req.body.domicilio,
fechaNacimiento: req.body.fechaNacimiento
//otropassword: req.body.otropassword
});
usuario.save().then(function(us){
res.redirect("/")
console.log("Se guardo el usuario");

},function(err){

  console.log(String(err));
  console.log("Hubo un error al guarda el usuario")
  res.redirect("/signup");
});

});



app.post("/agregarDesarrolador/:idUsuario/:idProy", function(req,res){
    console.log(req.params.idProy);
    console.log(req.params.idUsuario);
   Proyecto.findByIdAndUpdate(req.params.idProy, { $push : {equipoInvolucdrado:req.params.idUsuario}},function(err,proyecto){
        if(err){
         console.log(String(err));
       }else{
          console.log(proyecto);
          res.redirect("/simple-cards");
       }
   })
});

app.post("/agregarPO/:idUsuario/:idProy", function(req,res){
    console.log(req.params.idProy);
    console.log(req.params.idUsuario);
   Proyecto.findByIdAndUpdate(req.params.idProy, { $set : {productOwner:req.params.idUsuario}},function(err,proyecto){
       if(err){
         console.log(String(err));
       }else{
          console.log(proyecto);
          res.redirect("/simple-cards");
       }
   })
});


app.post("/sessions",
  passport.authenticate('local',{
      failureRedirect: '/login',
      failureFlash: true,
      session:false
}),function(req ,res){
    req.session.user = req.user._id;

    //req.session.rol = req.user.rol;
    console.log(req.user.nombreCompleto);
    res.redirect("/dashboard");
  });

app.post("/dashboard",function(req,res){
  console.log(req.body);
  console.log(req.session.user);
  var proyecto = new Proyecto({

    nombreProyecto:req.body.nombreProyecto,
    fechaSolicitud:req.body.fechaSolicitud,
    fechaArranque:req.body.fechaArranque,
    descripcion:req.body.descripcion,
    proyectManager:req.session.user,
    estadoProyecto: false
  });
  proyecto.save().then(function(proj){
    console.log(proj._id);
    Usuario.findByIdAndUpdate(req.session.user, { $set: { proyectos:proj._id }}, function (err, user) {
    if (err) console.log(String(err));
    console.log(user);

});
    res.redirect("/simple-cards");
    console.log("Se creo el proyecto-");
    console.log(proj);
  },function(err){
    console.log(String(err));
    console.log("Hubo un error");
  })
})





// Agregar PO.
// Agregar Developers.
// Eliminar proyecto.
app.post("/addpo/:_idProy", function(req, res) {
  var dataUser = [];
  console.log(req.params._idProy);
  Usuario.find({_id:{$ne:req.session.user}})
  .populate('proyectos')
  .exec(function(err,users){
    for(var i in users){
      dataUser.push(users[i]);
    }

    console.log(String(err));


  res.render("addProjectOwners",{
    users:dataUser,
    idProy:req.params._idProy
  });
  })
});

app.post("/adddev", function(req, res) {
  res.render("addDevelopers");
});

app.post("/adddev/:_idProy",user.can("anonymousUser"), function(req, res) {
  var dataUser = [];
  console.log(req.params._idProy);
  Usuario.find({_id:{$ne:req.session.user}})
  .populate('proyectos')
  .exec(function(err,users){
    for(var i in users){
      dataUser.push(users[i]);
    }

    console.log(String(err));


  res.render("addDevelopers",{
    users:dataUser,
    idProy:req.params._idProy
  });
  })
});

//Funcion que elimina un proyecto seleccionado
app.post("/delProject/:idProy", function(req, res) {
  console.log(req.params.idProy);
  Proyecto.remove({_id:req.params.idProy}, function(err,removed) {
    res.redirect("/dashboard");

});

});




app.post("/profile", function(req, res){
    var nombreUsuario="Hector Galvan";
    var fechaNacimiento="15/09/1992";
    var curp="";
    var RFC="";
    var domicilio="";
    var habiidades=["habilidad1","habilidad2","habilidad3"]


   res.render("profile",{nombreUsuario:nombreUsuario,
                        fechaNacimiento:fechaNacimiento,
                        curp:curp,
                        RFC:RFC,
                        domicilio:domicilio,
                        habilidades:habiidades
   });
});

server.listen(process.env.PORT || 8080);
