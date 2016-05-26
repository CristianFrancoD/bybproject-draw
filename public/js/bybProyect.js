bybApp = angular.module("bybApp",[]);
bybApp.controller("backlogCtrl",function($scope,$http,$location,$window){

    $scope.historias = [];
    $scope.releaseBacklog =[];
    $scope.userHistory = {};
    $scope.habilidades = [];
    $scope.haySprint = true;
    $scope.datosSprint={};
    $scope.sprint = [];
    $scope.closeSprint = false;
    $scope.sprintsAceptados = [];
    //Conexion a socket normal
    $scope.socket = io.connect("http://",{'forceNew':true},{secure:true});

    //Conexion a socket segura
    //$scope.socket = io.connect("https://",{'forceNew':true},{secure:true});


$scope.getUserHistory = function(id){
    $scope.idProy = id;
    console.log("Se ejecuto la funcion");
    console.log("El Id es"+id);
    $http.get("/api/backlog/" + $scope.idProy).success(function(data){
        console.log(data);
        $scope.historias = data;
        console.log($scope.userHistorys);
        }).error(function(err){
            console.log(String(err))
        })
    $http.get("/api/sprints/"+$scope.idProy).success(function(data) {
        $scope.sprint = data;
    }).error(function(err) {
        console.log(String(err))
    })
    $http.get("/api/releaseBacklog/"+$scope.idProy).success(function(data) {
        $scope.releaseBacklog = data;
    }).error(function(err) {
        console.log(String(err));
    })
    };
$scope.showEditbacklog = function(id){
    console.log(id);
    $scope.historyToEdit = $scope.historias[id]
    console.log($scope.historyToEdit);
};

$scope.editbacklog = function(){
    $http.post("/api/editbacklog",$scope.historyToEdit).success(function(data){
        console.log(data)
        $scope.socket.emit("editBacklog",$scope.historyToEdit);
    }).error(function(err){
        console.log(String(err))
    });
};

$scope.saveUserHistory = function(id){
    console.log("posteando...");
    console.log("El id al hacer el post es: ",id)
    $scope.userHistory.proyectos = id;
    console.log($scope.userHistory);
    $http.post("/api/backlog/"+id,$scope.userHistory).success(function(data){
    console.log(data);
    $scope.socket.emit("mensajeNuevo",data);
    }).error(function(err){
    console.log(String(err));
    })
    }
$scope.historyToRelease = function(item){
    //item.estado = !item.estado;
    $http.post("/api/userHistoryState/"+item._id,item).success(function(data) {
        console.log(data);
        console.log("El valor de la tarjeta es:"+ data.estado)
        $scope.socket.emit("editBacklog",data)
    }).error(function(err) {
        console.log(String(err));
    })
}
$scope.historyToSprint = function(item){
    if($scope.sprint!=null){
    console.log($scope.sprint.idSprint);
    console.log(item);
    var tamanioTotal = 0;
    for( var val in $scope.sprint.backlog){
        tamanioTotal+=$scope.sprint.backlog[val].tamanio;
    }
    console.log(tamanioTotal);
    console.log($scope.sprint.tamanioSprint);
    console.log(item.tamanio);
    if(($scope.sprint.tamanioSprint-tamanioTotal)>=item.tamanio){
        $scope.historyToRelease(item);
        $http.post("/api/historyToSprint/"+$scope.sprint.idSprint,item).success(function(data) {
        console.log(data);
       // $scope.sprint = data;
        console.log($scope.sprint);
       $scope.socket.emit("newSprint",data);
    }).error(function(err) {
        console.log(String(err));
    })
    }else{
        $window.alert("No es posible agregar la tarjeta se ha excedido el tamaño del Sprint");
    }
    }else{
        $window.alert("No es posible agregar la tarjeta no se ha creado Sprint")
    }
}
$scope.backlogAccepted = function(state,id,idSprint){
    console.log(state+" "+id);
    var backlogChanges = {
        _id:id,
        estadoAprobadaRechazada:state
    };
    $http.post("/api/backlogAccepted",backlogChanges).success(function(data) {
        console.log(data);
        for(var item in $scope.releaseBacklog[0].sprints){
            for(var val in $scope.releaseBacklog[0].sprints[item].backlog){
                var backlog = $scope.releaseBacklog[0].sprints[item].backlog;
                if(data._id==backlog[val]._id){

                    backlog.splice(val,1,data);
                    break;
                }
            }
        }
        $scope.socket.emit("editBacklog",data);
    }).error(function(err) {
        console.log(String(err));
    })
    acceptSprint(idSprint);
}
$scope.backlogRejected = function(state,item,idSprint){
    console.log(state+" "+item._id+" "+idSprint)
    var body = {
        idSprint:idSprint,
        idBacklog:item._id
    }
    $scope.historyToRelease(item);
    $http.post("/api/backlogRejected/",body).success(function(data) {
        console.log(data);
        $scope.socket.emit("newSprintToRelease",data);
    }).error(function(err) {
        console.log(String(err));
    })
}
$scope.addSkill = function(){
         $scope.habilidades.push({habilidad:$scope.skills.habilidad,grado:$scope.skills.grado});
         console.log($scope.habilidades);
         $scope.skills.habilidad = '';
         $scope.skills.grado = '';
     }
$scope.saveSkills = function(){
    var newSkills = {
        habilidades:$scope.habilidades
    }
    if($scope.habilidades.length>0){
        $http({
            url:"/api/saveSkills",
            method:'POST',
            data:$scope.habilidades
            }).success(function(data) {
                console.log(data);
                $window.alert("Habilidades guardadas con exito!")
            }).error(function(err) {
                console.log(String(err));
            })
         }
     }
     $scope.crearSprint = function(idProy){
         $http.post("/api/crearSprint/"+idProy,$scope.datosSprint).success(function(data) {
             console.log(data);
             $scope.haySprint = false;
             //$scope.sprint = data;
             $scope.socket.emit("newSprint",data);
         }).error(function(err) {
             console.log(String(err));
         })
     }

function sprintState(){
    $http.post("/api/sprintState",$scope.sprint).success(function(data) {
        console.log(data);
        $scope.sprint = data;
    }).error(function(err) {
        console.log(String(err));
    })
}
function acceptSprint(idSprint){
    console.log("AceptandoSprint")
    var noTarjetas = 0;
    var contador = 0;
    for(var item in $scope.releaseBacklog[0].sprints){
        if($scope.releaseBacklog[0].sprints[item]._id==idSprint){
            for(var val in $scope.releaseBacklog[0].sprints[item].backlog){
                console.log("Estado:"+$scope.releaseBacklog[0].sprints[item].backlog[val].estadoAprobadaRechazada)
                if($scope.releaseBacklog[0].sprints[item].backlog[val].estadoAprobadaRechazada !="pendiente"){
                    contador++;
                }
                noTarjetas++;
            }
        }

    }
    console.log("El numero de tarjetas son:"+noTarjetas);
    console.log("El numero de tarjetas aprobadas son:"+contador);
    if(noTarjetas==contador && noTarjetas!=0){
        return true;
    }
    return false;
}

$scope.checkSprint = function(id){
    var isReady = acceptSprint(id);
    console.log("El sprint esta listo?"+isReady);
    if(isReady){
        $http.post("/api/saveSprint/"+id).success(function(data) {
            $scope.socket.emit("newSprintToRelease",data);
        }).error(function(err) {
            console.log(String(err));
        })
    }else{
        $window.alert("Se deben de validar todas las tarjetas para aprobar el Sprint");
    }
}
$scope.sprintToRelease = function(){
    if($scope.sprint.backlog.length == 0){
        $window.alert("Es necesario incluir historias de usuario para poder enviar el Sprint al Release Backlog")
    }else{
    sprintState();
    $http.post("/api/SprintToRelease",$scope.sprint).success(function(data) {
        console.log(data);
        $scope.haySprint = true;
        $scope.sprint.mandadaAlRelease = true;
        $scope.sprint = {};
        $scope.socket.emit("newSprintToRelease",data);
        $window.alert("Se ha enviado el sprint al releaseBacklog");
    }).error(function(err) {
        console.log(String(err));
    })
    }
}
     $scope.socket.on("enviarMensajes",function(data){
            $scope.historias = data;
            console.log($scope.historias);
            $scope.$apply();
     });
     $scope.socket.on("agregarRelease",function(data) {
         console.log($scope.releaseBacklog);
         $scope.releaseBacklog = data;
         console.log(data);
         $scope.$apply();
     });
     $scope.socket.on("agregarSprint",function(data){
         console.log(data);
         $scope.sprint = data;
         var contador=0;
    for(var item in $scope.sprint){
        console.log($scope.sprint.hasOwnProperty(item))
        if($scope.sprint.hasOwnProperty(item)){
            contador++;
        }
    }
    if(contador!=0){
        $scope.haySprint = false;
    }
    console.log(contador==0);
         $scope.$apply();
     })
})
