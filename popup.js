chrome.storage.local.get('trucks', function(trucks) {
  var $tl = $("#truck-list");
  if (trucks['trucks'].length == 0) {
    $("#message").html("There are currently no food trucks nearby");
  } else {
    $("#message").html("The following food trucks are nearby:");
  }
  $.each(trucks['trucks'], function(idx, stop) {
    var $a = $("<a class='pull-left' href='http://www.chicagofoodtruckfinder.com/trucks/" + stop.truckId + "'></a>");
    $a.append("<img src='" + stop.truckIconUrl +"' title='" + stop.truckName + "'/>")
    var $li = $("<li class='media'></li>");
    $li.append($a);
    var $mediaBody = $("<div class='media-body'><h4>" + stop.truckName +"</h4></div>");
    $mediaBody.append(stop.locationName).append(" <br/>(").append(stop.distance) .append(" miles away)");
    $mediaBody.append("<br/>Est. departure: " + stop.endTime );
    $li.append($mediaBody);
    $tl.append($li);

  });
});

$(document).ready(function() {
  $(".settings-button").click(function(e) {
    e.preventDefault();
    var url = chrome.extension.getURL("options.html");
    chrome.tabs.create({url: url}, function() {});  
  })
})
