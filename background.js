function updateSchedule() {
  $.ajax({
    url : 'http://www.chicagofoodtruckfinder.com/services/daily_schedule?appKey=bbI9Xb5b',
    success : function(data) {
      var stops = data["stops"].length
      chrome.browserAction.setBadgeText({text: stops.toString()})
    }
  })
}
