  chrome.storage.local.get('trucks', function(trucks) {
    var $tl = $("#truck-list");
    console.log(trucks);
    $.each(trucks['trucks'], function(idx, stop) {
      console.log(stop);
      var truck = stop["truck"];
      // TODO: not sure why this happens
      if (!truck) {
        return;
      }
      var $a = $("<a class='pull-left' href='http://www.chicagofoodtruckfinder.com/trucks/" + truck["id"] + "'></a>");
      $a.append("<img src='" + truck["iconUrl"] +"' title='" + truck["name"] + "'/>")
      var $li = $("<li class='media'></li>");
      $li.append($a);
      var $mediaBody = $("<div class='media-body'><h4>" + truck["name"] +"</h4></div>");
      $mediaBody.append(stop["location"]["name"]).append(" (").append(stop.distance) .append(" miles away)");
      $li.append($mediaBody);
      $tl.append($li);

    });
  });
