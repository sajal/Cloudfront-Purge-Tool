/*
  Author: Sajal Kayan
  URL: http://www.cdnplanet.com/
  License: Undecided probably BSD style
  Description:  Access to CloudFront API from browser. Requires crossdomain XHR!!!.
                Wont work from webpages, but i'm making this for chrome extention.
  Sample Usage : 
    var c = new cloudfrontapi("XXXXXXXXXX", "XXXXXXXXX");
    c.usesystemtime = false; // set this if users system clock is innacurate by more than 15 mins
    var print = function(obj){
      console.log(obj);
    }
    c.getAllDistributions(print);
    c.getAllInvalidations("DISTIDXXX", print);
    c.getPendingInvalidations("DISTIDXXX", print);
  
  Dependencies: http://davidwalsh.name/convert-xml-json , http://www.java2s.com/Open-Source/Javascript/Benchmark/sunspider-mod/tests/sunspider-0.9.1/crypto-sha1.js.htm

*/


var cloudfrontapi = function(aws_access, aws_secret){
  this.aws_access = aws_access;
  this.aws_secret = aws_secret;
  this.usesystemtime = true;
  this.endpoint = "cloudfront.amazonaws.com";
//  this.tmpdatestr = ""

  this.getAWStime = function(){
    var req = new XMLHttpRequest();
    req.open(
      "GET",
      "https://cloudfront.amazonaws.com/date",
      false
    );
    req.send(null);
    return req.getResponseHeader("Date");
  }

  this.getDate = function(){
    if (this.usesystemtime){
      return (new Date()).toGMTString();
    } else {
      //fetch the date from AWS, since we dont trust system time
      return this.getAWStime()
    }
  }

  this.getAuth = function(){
    var datestr = this.getDate();
    //var signature = sha1.hmac.toB64(this.aws_secret, datestr);
    var signature = Crypto.util.bytesToBase64(Crypto.HMAC(Crypto.SHA1, datestr, this.aws_secret, { asBytes: true }));
    var authorization = "AWS " + this.aws_access + ":" + signature;
    return {datestr: datestr, authorization:authorization}
  };

  this.makeRequest = function(path, callback, data){
    var req = new XMLHttpRequest();
    var auth = this.getAuth();
    var method = "POST";
    if (data == undefined){
      method = "GET";
      data == null;
    }
    req.open(
      method,
      "https://" + this.endpoint + path,
      true
    );
    req.setRequestHeader("Authorization", auth.authorization);
    req.setRequestHeader("x-amz-date", auth.datestr);
    if (method == "POST"){
      req.setRequestHeader("Content-Type", "text/xml");
    }
    req.onload = function(){
      console.log(req);
      var error = null;
      if ((req.status != 200) && (req.status != 201)){
        error = {
          status:req.status,
          message: req.responseXML.getElementsByTagName("Message")[0].textContent,
          code: req.responseXML.getElementsByTagName("Code")[0].textContent
        }
      }
      console.log(error);
      callback(req, error);
    };
    req.send(data);
  }

  this.getfield = function(node, tagname){
    console.log(tagname);
    console.log(node);
    return node.getElementsByTagName(tagname)[0].textContent
  }

  this.getAllDistributions = function(callback, errorfn){
    /*
    Returns Array : List of CloudFront distributions.
    */
    var getfield = this.getfield;
    var localcb = function(res, error){
      console.log(error)
      if (error == null){
        var distributions = xmlToJson(res.responseXML).DistributionList.DistributionSummary;
        if (distributions.length == undefined){
          distributions = [distributions];
        }
        callback(distributions);
      } else {
        errorfn(error);
      }
    };
    this.makeRequest("/2010-11-01/distribution", function(res, error){ localcb(res, error) })
  };

  this.getAllInvalidations = function(distid, callback){
    /*
    Returns Array : List of last 20 invalidation requests.
    */
    var getfield = this.getfield;
    var localcb = function(res){
      var invalidations = xmlToJson(res.responseXML).InvalidationList.InvalidationSummary;
      if (invalidations == undefined){
        callback([]);
      } else {
        if (invalidations.length == undefined){
          invalidations = [invalidations];
        }
        callback(invalidations);
      }
    }
    this.makeRequest("/2010-11-01/distribution/" + distid + "/invalidation?MaxItems=20", localcb);
  };

  this.getPendingInvalidations = function(distid, callback){
    /*
    Returns Array : List of last 20 invalidation requests (only filtering non completed ones).
    */
    var localcb = function(allinvalidations){
      pending = [];
      for(i=0;i<allinvalidations.length;i++){
        if(allinvalidations[i].Status["#text"] != 'Completed'){
          pending.push(allinvalidations[i]);
        }
      }
      callback(pending);
    }
    this.getAllInvalidations(distid, localcb);
  };

  this.AddNewPurgeRequest = function(distid, pathcsv, callback, errorfn){
    /*
    Places a purge request for comma seperated list of paths.
    */
    var localcb = function(res, error){
      if (error == null){
        callback(res);
      } else {
        errorfn(error);
      }
    }
    var files = pathcsv.split(',');
    var invallist = "";
    for(i=0;i<files.length;i++){
      invallist += '<Path>' + files[i].trim() + '</Path>'
    }
    var callerref = "batch" + (new Date()).getTime();
    var teststr = "<InvalidationBatch>" + invallist + "<CallerReference>" + callerref + "</CallerReference></InvalidationBatch>";
    console.log(teststr);
    var path = "/2010-11-01/distribution/" + distid + "/invalidation";
    this.makeRequest(path, localcb, teststr);
  };

  this.getInvalidationDetails = function(distid, invalid, callback){
    //todo
    var localcb = function(res){
      callback(xmlToJson(res.responseXML));
    }
    var path = "/2010-11-01/distribution/" + distid + "/invalidation/" + invalid;
    console.log(path)
    this.makeRequest(path, localcb);
  };

}