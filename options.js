
function loadSettings() {
  chrome.storage.sync.get({ searchRadius : 0.25, notifications: true}, function(items) {
    $("#radius").val(items.searchRadius.toString());
    $("#foodTruckNotifications").prop("checked", items.notifications);
  });
}

$(document).ready(loadSettings);

$("#save").click(function() {
  var radius = parseFloat($("#radius").val()),
      notifications = $("#foodTruckNotifications").is(":checked");
  chrome.storage.sync.set({ searchRadius : radius, notifications: notifications}, function(f) {
    var port = chrome.extension.connect({name: 'background communication'});
    port.postMessage("refresh");
  });
});