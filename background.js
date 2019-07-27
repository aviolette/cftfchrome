FoodTruckFinder = (function () {

  var myLocation = null,
      intervalId = null,
      lastPoll = null,
      recordedStops = {},
      notificationId = null,
      trucks = null,
      defaultCity = "Chicago",
      THIRTY_MINUTES = 1800000,
      TEN_MINUTES = 600000,
      CHICAGO = { appKey: 'bbI9Xb5b', latitude: 41.880187, longitude: -87.63083499999999, url: "http://www.chicagofoodtruckfinder.com", name: "Chicago Food Truck Finder" },
      NYC = {appKey: 'QbbWQbGb', latitude: 40.7098622, longitude: -73.9638361, url: "http://www.nycfoodtruckfinder.com", name: "NYC Food Truck Finder"}
      NOTIFICATION_ID = "truckz";


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
            savory: item.truck.savory,
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

  function sendNotification(stops, filterType) {
    if (stops.length == 0) {
      return;
    }
    var trucksToAdd = [];
    $.each(stops, function (idx, foo) {
      if ((filterType == "savory" && !foo.savory) || (filterType == "dessert" && foo.savory)) {
        return;
      }
      var key = "" + foo.key;
      if (!recordedStops[key]) {
        trucksToAdd.push(foo["truckName"]);
      }
      recordedStops[key] = 1;
    });
    chrome.storage.local.set({"recordedStops": recordedStops}, function (item) {
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
    chrome.storage.sync.get({searchRadius: 0.25, notifications: true, filter: "both"}, function (items) {
      console.log("Using radius: " + parseFloat(items.searchRadius));
      var stops = trucks.openNowWithinMiles(parseFloat(items.searchRadius)),
          num = stops.length;
      num = (num == 0) ? "" : num.toString();
      //noinspection JSUnresolvedFunction
      chrome.browserAction.setBadgeText({text: num});
      chrome.storage.local.set({'trucks': stops}, function () {});
      if (items.notifications) {
        sendNotification(stops, items.filter);
      }
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
      chrome.storage.local.set({'recordedStops': recordedStops}, function () {
      });
    }
    if (lastPoll == null || (now - lastPoll) >= interval) {
      lastPoll = now;
      updateSchedule();
    } else {
      updateView();
    }
  }

  function findClosest() {
    return CHICAGO;
  }

  function updateSchedule() {
    var closestService = findClosest();
    chrome.storage.local.set({service: closestService }, function () {});

    console.log("Updating food truck finder schedule with " + closestService.url + " at " + (new Date(Clock.now())));

    $.ajax({
      url: closestService.url + '/services/daily_schedule?appKey=' + closestService.appKey,
      success: function (data) {
        console.log("update complete");
        trucks = new Trucks(data);
        updateView();
      }
    })
  }

  function success(position) {
    console.log("Retrieved current position");
    myLocation = position.coords;
    updateData();
    intervalId = setInterval(updateData, 300000);
  }

  function error() {
    console.log("Error retreving current position");
    myLocation = findClosest();
    intervalId = setInterval(updateData, 300000);
  }

  var watchId = navigator.geolocation.watchPosition(function (position) {
    myLocation = position.coords;
  });

  return {
    run: function () {
      chrome.notifications.onClicked.addListener(function(notificationId) {
        var closestService = findClosest();
        chrome.tabs.create({url: closestService.url});
      });
      chrome.storage.local.get({recordedStops: {}}, function (items) {
        console.log("Retrieved recorded stops");
        recordedStops = items.recordedStops;
        chrome.extension.onConnect.addListener(function (port) {
          port.onMessage.addListener(function (msg) {
            if (msg == 'refresh') {
              chrome.storage.sync.get({defaultCity: defaultCity}, function (items) {
                defaultCity = items.defaultCity;
                updateSchedule();
              });
            }
          });
        });
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(success, error);
        }
      });
    },
    clear: function() {
      recordedStops = {};
      chrome.storage.local.set({recordedStops: {}, service: null}, function () {});
    },
    refresh: function () {
      updateSchedule();
    }
  }
})();

FoodTruckFinder.run();
