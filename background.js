var myLocation = null,
  THRESHOLD = 0.25,
  trucks = null;

var Clock = {
    now: function () {
      return new Date().getTime();
    }
  };

var Trucks = function (model) {
  this.stops = [];
  this.trucks = {};
  var self = this;
  for (var i = 0; i < model["trucks"].length; i++) {
    this.trucks[model["trucks"][i]["id"]] = model["trucks"][i];
  }

  $.each(model["stops"], function (idx, item) {
    self.stops.push(buildStop(item));
  });

  function buildStop(stop) {
    return {
      stop: stop,
      truck: self.trucks[stop["truckId"]],
      location: model["locations"][stop["location"] - 1],
      position:  {
        latitude : model["locations"][stop["location"] - 1].latitude,
        longitude : model["locations"][stop["location"] - 1].longitude 
      }
    }
  }

  this.openNowWithinMiles = function (mile) {
    var now = Clock.now(), items = [];
    $.each(self.stops, function (idx, item) {
      if (item.stop["startMillis"] <= now && item.stop["endMillis"] > now && distance(item.position, myLocation) < mile) {
        items.push(item);
      }
    });
    return items;
  };
};


function success(position) {
  myLocation = position.coords;
}

function error() {
  myLocation = null;
}

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(success, error);
}

function distance(pos1, pos2) {
  var radlat1 = Math.PI * pos1.latitude/180,
      radlat2 = Math.PI * pos2.latitude/180,
      radlon1 = Math.PI * pos1.longitude/180,
      radlon2 = Math.PI * pos2.longitude/180,
      theta = pos1.longitude - pos2.longitude,
      radtheta = Math.PI * theta/180,
      dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  dist = Math.acos(dist)
  dist = dist * 180/Math.PI
  dist = dist * 60 * 1.1515
  return dist
}

var watchId = navigator.geolocation.watchPosition(function(position) {  
  myLocation = position.coords;
});

function updateSchedule() {
  $.ajax({
    url : 'http://www.chicagofoodtruckfinder.com/services/daily_schedule?appKey=bbI9Xb5b',
    success : function(data) {
      trucks = new Trucks(data);
      var stops = trucks.openNowWithinMiles(THRESHOLD),
        num = stops.length;
      num = (num == 0) ? "" : num.toString();
      chrome.browserAction.setBadgeText({ text: num })
    }
  })
}
