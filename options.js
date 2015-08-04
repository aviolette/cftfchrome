
function loadSettings() {
  chrome.storage.sync.get({ searchRadius : 0.25, notifications: true, filter: "both"}, function(items) {
    $("#radius").val(items.searchRadius.toString());
    $("#foodTruckNotifications").prop("checked", items.notifications);
    $("#" + items.filter).prop("checked", true);
  });
}


$(document).ready(loadSettings);

$("#save").click(function() {
  var radius = parseFloat($("#radius").val()),
      filter = $('input[name=filterRadio]:checked').val(),
      notifications = $("#foodTruckNotifications").is(":checked");
  chrome.storage.sync.set({ searchRadius : radius, notifications: notifications, filter: filter}, function(f) {
    var port = chrome.extension.connect({name: 'background communication'});
    port.postMessage("refresh");
    chrome.tabs.getCurrent(function(f) {
      chrome.tabs.remove(f.id);
    });
  });
});