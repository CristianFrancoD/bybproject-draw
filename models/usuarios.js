var mongoose = require("mongoose");
mongoose.connect("mongodb://generico:123@ds015713.mlab.com:15713/bybdatabase");
var Schema = mongoose.Schema,
ObjectId = Schema.ObjectId;

var usuarioSchema = new Schema();
var rolSchema = new Schema();
var proyectosSchema = new Schema();
var backlogSchema = new Schema();
var sprintSchema = new Schema();
var releaseSchema = new Schema();


 usuarioSchema.add({
id:ObjectId,
nombre: String,
apellidoP: String,
apellidoM: String,
email: String,
curp:String,
rfc:String,
domicilio:String,
fechaNacimiento:String,
habilidades:[{
    habilidad:String,
    grado:String
}],
contrasena:{type:String, minlength:[6,"El password es muy corto"]/*,validate:{
      validator: function(p){
        return this.confirmarPassword == p;
      }, message: "Las contraseñas no son iguales"
      }*/
    },
proyectos:{type : mongoose.Schema.ObjectId, ref : 'Proyecto'}
});

rolSchema.add({
    id:ObjectId,
    nombreRol:String,
})

proyectosSchema.add({
   id:Schema.ObjectId,
   nombreProyecto: String,
   fechaSolicitud: String,
   fechaArranque: String,
   descripcion: String,
   proyectManager: {type : mongoose.Schema.ObjectId, ref : 'Usuario'},
   productOwner: {type : mongoose.Schema.ObjectId, ref : 'Usuario'},
   equipoInvolucdrado: [{ type:mongoose.Schema.ObjectId ,ref: 'Usuario'}],
   estadoProyecto: Boolean

});


backlogSchema.add({
  id:Schema.ObjectId,
  como:String,
  detalmanera: String,
  quiero: String,
  creadorTarjeta: String,
  narrativa: String,
  prioridad: String,
  tamanio: Number,
  criteriosAceptacion: String,
  dado: String,
  cuando: String,
  entonces: String,
  estadoAprobadaRechazada: String,
  estado:Boolean,
  proyectos:[ {type : mongoose.Schema.ObjectId, ref : 'Proyecto'}]
});

sprintSchema.add({
    idSprint:Number,
    tamanioSprint:Number,
    mandadaAlRelease:Boolean,
    aprobado:Boolean,
    backlog:[{type:mongoose.Schema.ObjectId, ref: 'Backlog'}],
    proyecto:{type:mongoose.Schema.ObjectId,ref:'Proyecto'}
});
releaseSchema.add({
    sprints:[{type:mongoose.Schema.ObjectId,ref:'Sprint'}],
    proyecto:{type:mongoose.Schema.ObjectId,ref:'Proyecto'}
})

usuarioSchema.virtual("confirmarPassword").get(function(){
   return this.otroPassword;
}).set(function(contrasena){
    this.otroPassword = contrasena;
});

/*usuarioSchema.virtual("allProyects").get(function(){
    return this.proyectos;
}).set(function(proyectos){
    this.proyectos = proyectos;
})*/
usuarioSchema.virtual("nombreCompleto").get(function(){
    return this.nombre + " " + this.apellidoP;
})

//var Usuario = mongoose.model("Usuario",usuarioSchema);
module.exports ={
    Usuario: mongoose.model('Usuario',usuarioSchema),
    Backlog: mongoose.model('Backlog',backlogSchema),
    Proyecto: mongoose.model('Proyecto',proyectosSchema),
    Sprint: mongoose.model('Sprint',sprintSchema),
    Release: mongoose.model('Release',releaseSchema)
};
