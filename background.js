FoodTruckFinder = (function () {

  var myLocation = null,
      intervalId = null,
      lastPoll = null,
      recordedStops = {},
      notificationId = null,
      trucks = null,
      THIRTY_MINUTES = 1800000,
      TEN_MINUTES = 600000,
      NOTIFICATION_ID = "truckz";

  function sortByDistanceFromLocation(stops, location) {
    return stops.sort(function (a, b) {
      if (typeof a.distance == "undefined" || a.distance == null) {
        return 0;
      }
      return a.distance > b.distance ? 1 : ((a.distance == b.distance) ? 0 : -1);
    });
  }


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

    //noinspection JSUnresolvedVariable
    $.each(model["stops"], function (idx, item) {
      self.stops.push(buildStop(item));
    });

    function buildStop(stop) {
      return {
        stop: stop,
        truck: self.trucks[stop["truckId"]],
        location: model["locations"][stop["location"] - 1],
        position: {
          latitude: model["locations"][stop["location"] - 1].latitude,
          longitude: model["locations"][stop["location"] - 1].longitude
        }
      }
    }

    this.openNowWithinMiles = function (mile) {
      var now = Clock.now(), items = [];
      $.each(self.stops, function (idx, item) {
        var dist = distance(item.position, myLocation);
        if (item.stop["startMillis"] <= now && item.stop["endMillis"] > now && dist < mile) {
          var stopItem = {
            distance: dist,
            truckIconUrl: item.truck.iconUrl,
            truckName: item.truck.name,
            endTime: item.stop["endTime"],
            key: item.stop["key"],
            truckId: item.truck.id,
            locationName: item.location.name
          };
          items.push(stopItem);
        }
      });
      return sortByDistanceFromLocation(items, myLocation);
    };
  };

  function previousDay(time) {
    return new Date(time).getDay() != new Date(lastPoll).getDay();
  }

  function sendNotification(stops) {
    if (stops.length == 0) {
      return;
    }
    var trucksToAdd = [];
    $.each(stops, function (idx, foo) {
      var key = "" + foo.key;
      if (!recordedStops[key]) {
        trucksToAdd.push(foo["truckName"]);
      }
      recordedStops[key] = 1;
    });
    if (trucksToAdd.length == 0) {
      return;
    }
    var options = {
      type: "basic", iconUrl: "logo48x48.png", title: "New Stops Added Nearby",
      message: trucksToAdd.join(", ")
    };
    chrome.notifications.clear(NOTIFICATION_ID, function() {});
    chrome.notifications.update(NOTIFICATION_ID, options, function() {
      notificationId = chrome.notifications.create(NOTIFICATION_ID, options, function () {});
    });
  }

  function updateView() {
    chrome.storage.sync.get({searchRadius: 0.25}, function (items) {
      console.log("Using radius: " + parseFloat(items.searchRadius));
      var stops = trucks.openNowWithinMiles(parseFloat(items.searchRadius)),
          num = stops.length;
      num = (num == 0) ? "" : num.toString();
      //noinspection JSUnresolvedFunction
      chrome.browserAction.setBadgeText({text: num});
      chrome.storage.local.set({'trucks': stops}, function () {});
      sendNotification(stops);
    });
  }

  function isGoTime(now) {
    var d = new Date(now);
    return (d.getHours() >= 10 && d.getHours() < 14) || (d.getHours() >= 7 && d.getHours() < 9);
  }

  function updateData() {
    var now = Clock.now();
    var interval = isGoTime(now) ? TEN_MINUTES : THIRTY_MINUTES;
    if (previousDay(lastPoll)) {
      recordedStops = {};
    }
    if (lastPoll == null || (now - lastPoll) >= interval) {
      lastPoll = now;
      updateSchedule();
    } else {
      updateView();
    }
  }

  function updateSchedule() {
    console.log("Updating chicago food truck finder schedule at " + (new Date(Clock.now())));
    $.ajax({
      url: 'http://www.chicagofoodtruckfinder.com/services/daily_schedule?appKey=bbI9Xb5b',
      success: function (data) {
        console.log("update complete");
        trucks = new Trucks(data);
        updateView();
      }
    })
  }

  function success(position) {
    myLocation = position.coords;
    updateData();
    intervalId = setInterval(updateData, 300000);
  }

  function error() {
    myLocation = null;
  }

  function distance(pos1, pos2) {
    var radlat1 = Math.PI * pos1.latitude / 180,
        radlat2 = Math.PI * pos2.latitude / 180,
        radlon1 = Math.PI * pos1.longitude / 180,
        radlon2 = Math.PI * pos2.longitude / 180,
        theta = pos1.longitude - pos2.longitude,
        radtheta = Math.PI * theta / 180,
        dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist);
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.1515;
    dist = Math.floor(dist * 100) / 100;
    return dist;
  }

  var watchId = navigator.geolocation.watchPosition(function (position) {
    myLocation = position.coords;
  });

  return {
    run: function () {
      chrome.extension.onConnect.addListener(function (port) {
        port.onMessage.addListener(function (msg) {
          if (msg == 'refresh') {
            updateSchedule();
          }
        });
      });
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(success, error);
      }
    },
    clear: function() {
      recordedStops = {};
    },
    refresh: function () {
      updateSchedule();
    }
  }
})();

FoodTruckFinder.run();
