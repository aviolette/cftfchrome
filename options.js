
function loadSettings() {
  chrome.storage.sync.get({ searchRadius : 0.25}, function(items) {
    $("#radius").val(items.searchRadius.toString());
  });
}

$(document).ready(loadSettings);

$("#save").click(function() {
  var radius = parseFloat($("#radius").val());
  chrome.storage.sync.set({ searchRadius : radius}, function() {
    var port = chrome.extension.connect({name: 'background communication'});
    port.postMessage("refresh");
  });
});