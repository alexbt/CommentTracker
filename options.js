var DEFAULT_SKIP_KEYWORDS = 'LGTM\nReactions should always'

// Saves options to chrome.storage.sync.
function save_options() {
  var skipKeywords = document.getElementById('skipKeywords').value;
  chrome.storage.sync.set({
    skipKeywords: skipKeywords
  }, function () {
    window.close();
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    skipKeywords: DEFAULT_SKIP_KEYWORDS
  }, function (items) {
    document.getElementById('skipKeywords').value = items.skipKeywords;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);