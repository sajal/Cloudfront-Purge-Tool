
window.pendinginvalidations = [];


var distributionclickhandler = function(distid){
  if (typeof(distid) == "string"){
    var id = distid;
  } else {
    var id = this.getElementsByClassName("id")[0].innerHTML;
  }
  console.log(id);
  window.currentdist = id;
  cfobj.getAllInvalidations(id, updateinvalidations);
}

var invaldetails = function(){
  var id = this.getElementsByClassName("id")[0].innerHTML;
  $( "#invaldetails" )[0].innerHTML = "Loading..."
  cfobj.getInvalidationDetails(currentdist, id);
}

var placepurgereq = function(box){
  var flist = document.getElementById("csvpathlist").value;
  console.log(flist);
  console.log(currentdist);
  var errorhandler = function(error){
    document.getElementById("invalerror").innerHTML = error.message;
  }
  cfobj.AddNewPurgeRequest(currentdist, flist, function(res){
    console.log(res);
    document.getElementById("csvpathlist").value = "";
    distributionclickhandler(currentdist);
  }, errorhandler );
}

var updateinvaldetails = function(obj){
  //invaldetails
  console.log(obj);
  var id = obj.Invalidation.Id["#text"];
  var created = obj.Invalidation.CreateTime["#text"];
  var status = obj.Invalidation.Status["#text"];
  var rawpaths = obj.Invalidation.InvalidationBatch.Path;
  var paths = "";
  if (rawpaths.length == undefined){
    paths = rawpaths["#text"];
  } else {
    var patharr = [];
    for (i=0;i<rawpaths.length;i++){
      patharr.push(rawpaths[i]["#text"])
    }
    paths = patharr.join(",")
  }
  
  var inval = $("#invaldetails")[0];
  inval.innerHTML = '<h3 class="ui-widget-header ui-corner-all">Purge Details</h3>Id: ' + id + "<br>Created : " + created + "<br>Files: " + paths + " <br>Status: " + status
  $( "#invaldetails" ).effect( "slide", {}, 500 );
}


var updatedistlist = function(dist){
  console.log(dist);
  var distributions = document.getElementById("distributions");
  var ol = document.createElement('ul');
  ol.id = "distlist";
  for (i=0;i<dist.length;i++){
    var box = document.createElement('li');
    box.className = "distbox";
    box.classList.add("ui-widget-content");
    var el = document.createElement('div');
    el.className = "id";
    el.appendChild(document.createTextNode(dist[i].Id["#text"]));
    var cname = document.createElement('div');
    cname.className = "cnames";

    var cn = document.createElement('div');
    cn.className = "cname";
    cn.appendChild(document.createTextNode(dist[i].DomainName["#text"]));
    cname.appendChild(cn);        

    var cnames = dist[i].CNAME;
    if (cnames != undefined){
      if (cnames["#text"] != undefined){
        var cn = document.createElement('div');
        cn.className = "cname";
        cn.appendChild(document.createTextNode(cnames["#text"]));
        cname.appendChild(cn);        
      } else {
        for(j=0;j<cnames.length;j++){
          var cn = document.createElement('div');
          cn.className = "cname";
          cn.appendChild(document.createTextNode(cnames[j]["#text"]));
          cname.appendChild(cn);
        }        
      }
    }
    console.log(cname);
    box.appendChild(el);
    box.appendChild(cname);
//    box.onclick = distributionclickhandler;
    ol.appendChild(box);
    distributions.appendChild(ol);
  }
  distributions.style.display="";
  $( "#distlist" ).selectable();
  $( "#distlist" ).bind( "selectableselected", function(event, ui) {
    id = ui.selected.getElementsByClassName("id")[0].innerHTML;
    window.currentdist = id;
    cfobj.getAllInvalidations(id, updateinvalidations);
  });

}

var updateinvalidations = function(invals){
  console.log(invals);
  var invalidations = document.getElementById("invalidations");
  //remove all childrens if exists
  if ( invalidations.hasChildNodes() ){
    while ( invalidations.childNodes.length >= 1 ){
      invalidations.removeChild( invalidations.firstChild );       
    } 
  }
  //<h3 class="ui-widget-header ui-corner-all">Invalidations</h3>
  title = document.createElement('h3');
  title.className = "ui-widget-header ui-corner-all";
  title.appendChild(document.createTextNode("Invalidations"));
  invalidations.appendChild(title);
  var ol = document.createElement('ul');
  ol.id = "invallist";
  for (i=0;i<invals.length;i++){
    var box = document.createElement('div');
    box.className = "invalbox";
    var el = document.createElement('div');
    el.className = "id";
    el.appendChild(document.createTextNode(invals[i].Id["#text"]));
    var st = document.createElement('div');
    st.className = invals[i].Status["#text"];
    //box.classList.add(invals[i].Status["#text"]);
    st.appendChild(document.createTextNode(invals[i].Status["#text"]));
    box.appendChild(el);
    box.appendChild(st);
    //box.onclick = invaldetails;
    ol.appendChild(box);
    invalidations.appendChild(ol);

    var searchobjlist = function(list, id){
      for(k=0;k<list.length;k++){
        if (list[k].id == id){
          return k
        } 
      }
      return -1
    }
    var indexcur = searchobjlist(pendinginvalidations, invals[i].Id["#text"]);
    if (invals[i].Status["#text"] == "Completed"){
      
      if (indexcur != -1){
        // current invalidation was pending earlier, but Completed now
        // Remove from pending
        pendinginvalidations.splice(indexcur, 1);
        // Now Notify user
        
        var notification = webkitNotifications.createNotification(
          'icon.png',  // icon url - can be relative
          'Purge Completed!' ,  // notification title
          'ID: ' + invals[i].Id["#text"] // notification body text
        );
        notification.show();
        
      }
      
    } else if (invals[i].Status["#text"] == "InProgress"){
      // current invalidation is in progress
      if (indexcur == -1){
        //current invalidation was not discovered earlier
        pendinginvalidations.push({id: invals[i].Id["#text"], distid:window.currentdist.toString()});
      }
    }
  }

  invalidations.style.display = "";
  document.getElementById("newinval").style.display = "";
  $( "#invallist" ).selectable();
  $( "#invallist" ).bind( "selectableselected", function(event, ui) {
    id = ui.selected.getElementsByClassName("id")[0].innerHTML;
    //console.log(id);
    cfobj.getInvalidationDetails(currentdist, id, updateinvaldetails);
    //window.currentdist = id;
    //cfobj.getAllInvalidations(id, updateinvalidations);
  });
}


var auth = function(){
  var secret = document.getElementById("AWSsecret").value
  var access = document.getElementById("AWSaccess").value
  window.cfobj = new cloudfrontapi(access, secret);
  localStorage.savebox = document.getElementById("savecredentials").checked;
  if (document.getElementById("savecredentials").checked){
    localStorage.access=access;
    localStorage.secret=secret;
  } else {
    //delete previously saved creds if any
    localStorage.access="";
    localStorage.secret="";
  }

  var success = function(dist){
    //hide the login box
    var loginbox = document.getElementById("auth")
    loginbox.style.display="none";
    updatedistlist(dist);
  }

  cfobj.getAllDistributions(success, function(error){
    document.getElementById("loginerror").innerHTML = error.message;
  });
}


$(document).ready(function() {
  /*
  var notification = webkitNotifications.createNotification(
    'icon.png',  // icon url - can be relative
    'Hello World!',  // notification title
    'Welcome to this extension...'  // notification body text
  );
  notification.show();
  */
  var access = localStorage.access;
  var secret = localStorage.secret;
  document.getElementById("savecredentials").checked = localStorage.savebox;
  if ((access != undefined) && (secret != undefined)){
    document.getElementById("AWSsecret").value = secret;
    document.getElementById("AWSaccess").value = access;
  }
});