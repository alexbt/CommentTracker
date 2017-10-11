var DEFAULT_SKIP_KEYWORDS = 'LGTM\nReactions should always'

// Saves options to chrome.storage.sync.
function save_options() {
  var skipKeywords = document.getElementById('skipKeywords').value;
  var modeAuthor = document.getElementById('modeAuthor').checked;

  chrome.storage.sync.set({
    skipKeywords: skipKeywords,
    mode: modeAuthor?'modeAuthor':'modeReview'
  }, function () {
    alert(modeAuthor)
    window.close();
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    skipKeywords: DEFAULT_SKIP_KEYWORDS,
    mode: 'modeAuthor'
  }, function (items) {
    document.getElementById('skipKeywords').value = items.skipKeywords;
    document.getElementById(items.mode).checked = true;
    alert(items.mode)
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);