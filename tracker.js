/**
 * Tracks ThumbsUp (+1) to mark comments as Resolved / Unresolved
 */

var unresolvedComments = new Set();
var username;
var isFiles = false
var isDiscussion = false
var skipKeywords;
var DEFAULT_SKIP_KEYWORDS = 'LGTM\nReactions should always'
var pageHasChanged = false;
var canBeMerged = false;


/**
 * Main
 */
var main = function () {
  chrome.storage.sync.get({
    polling: true,
    skipKeywords: DEFAULT_SKIP_KEYWORDS
  }, function (items) {
    username = document.getElementsByClassName('pull-header-username')[0].innerText
    skipKeywords = items.skipKeywords.trim().replace("\n", "|");
    document.addEventListener('DOMNodeInserted', function () {
      if (!pageHasChanged) {
        pageHasChanged = true;
        setTimeout(function () {
          displayAllLabels();
          pageHasChanged = false;
        }, 100);
      }
    });

    var debouncedCheckThreads = _.debounce(displayAllLabels, 100);
    waitForKeyElements('.comment', debouncedCheckThreads);
  });
};

/**
 * Entrypoint
 */
main();


/**
 * Loops through the comment to display the labels
 */
var displayAllLabels = function () {
  var allComments = findAllComments();
  var i = 0;
  allComments.forEach((item, index, array) => {
    displayLabel(item);
    i++;
    if (i === array.length) {
      expandUnresolvedComments(allComments);
      updateTopBottom();
    }
  });
}

/**
 * Displays the label on a comment thread (for each sub-comment)
 */
var displayLabel = function (info) {
  var id = info.id;
  var elem = $('#' + id).first();

  if (!id.match(/^issuecomment/)) {
    var threadComments = $(elem).parents('.js-comments-holder').children('.js-comment');
    threadComments.each(function () {
      appendLabelStyle(this);
    });
  } else {
    appendLabelStyle(elem);
  }
};

/**
 * Return an array with comments thread
 */
var findAllComments = function () {
  var threads = [];

  $('#discussion_bucket .js-line-comments .js-comments-holder')
    .each(function () {
      isDiscussion = true;
      var childComments = $(this).children('.js-comment');
      if (childComments.length > 0) {
        var firstCommentChild = childComments.first()[0];
        threads.push({
          id: firstCommentChild.id,
          comments: childComments,
          lastCommentId: childComments.last()[0].id,
        });
      }
    });

  $('#discussion_bucket .timeline-comment-wrapper .timeline-comment.js-comment')
    .each(function () {
      isDiscussion = true;
      if (this.id && this.id.match(/^issuecomment/)) {
        threads.push({
          id: this.id,
          comments: $(this),
          lastCommentId: this.id,
        });
      }
    });

  $('#files .review-comment')
    .each(function () {
      isFiles = true;
      threads.push({
        id: this.id,
        comments: $(this),
        lastCommentId: this.id,
      });
    });

  return threads;
};


/**
 * Expand outdated unresolved comments
 */
var expandUnresolvedComments = function (allComments) {
  _.each(allComments, function (info) {
    var comment = info.comments

    var isFromMe = (isFiles && comment[0].innerHTML.indexOf("/" + username + "\" class=\"author") != -1) ||
      (isDiscussion && comment[0].innerHTML.indexOf("/" + username + "\" class=\"author") != -1)

    var hasThumb = (isFiles && comment[0].innerHTML.indexOf(username + " reacted with thumbs up") != -1) ||
      (isDiscussion && comment[0].innerHTML.indexOf(username + " reacted with thumbs up") != -1)

    if (!isFromMe && !hasThumb) {
      var id = info.id;
      var elem = $('#' + id).first();
      var container = elem.parents('.outdated-comment');
      if (container.length > 0) {
        container.removeClass('closed').addClass('open');
      }
    }
  });
};

/**
 * Displays the message at the top and bottom
 */
var updateTopBottom = function () {
  if (!canBeMerged) {
    canBeMerged = $('.js-merge-branch-action').hasClass('btn-primary');
  }
  $('.comment-track-status').remove();

  if (canBeMerged) {
    if (unresolvedComments.size = 0) {
      // Make button green
      $('.js-merge-branch-action').addClass('btn-primary');
      $('.branch-action').addClass('branch-action-state-clean').removeClass('branch-action-state-dirty');
      $('.status-heading').text('This pull request can be automatically merged.');
      $('.status-meta').text('Merging can be performed automatically.');
      $('.branch-action-item-icon').removeClass('completeness-indicator-problem')
        .addClass('completeness-indicator-success')
        .html('<svg aria-hidden="true" class="octicon octicon-alert" height="16" role="img" version="1.1" viewBox="0 0 12 16" width="12">' +
          '<path d="M12 5L4 13 0 9l1.5-1.5 2.5 2.5 6.5-6.5 1.5 1.5z"></path></svg>');
    } else {
      // Make button grey
      $('.js-merge-branch-action').removeClass('btn-primary');
      $('.branch-action').removeClass('branch-action-state-clean').addClass('branch-action-state-dirty');
      $('.status-heading').text('Merge with caution!');
      $('.status-meta').text('You have unresolved comments!');
      $('.branch-action-item-icon').removeClass('completeness-indicator-success')
        .addClass('completeness-indicator-problem')
        .html('<svg aria-hidden="true" class="octicon octicon-alert" height="16" role="img" version="1.1" viewBox="0 0 16 16" width="16">' +
          '<path d="M15.72 12.5l-6.85-11.98C8.69 0.21 8.36 0.02 8 0.02s-0.69 0.19-0.87 0.5l-6.85 11.98c-0.18 0.31-0.18 0.69 0 1C0.47 13.81 ' +
          '0.8 14 1.15 14h13.7c0.36 0 0.69-0.19 0.86-0.5S15.89 12.81 15.72 12.5zM9 12H7V10h2V12zM9 9H7V5h2V9z"></path></svg>');
    }
  } else if (unresolvedComments.size != 0) {
    displayWarnings()
  } else {
    displaySuccess();
  }
  unresolvedComments.clear();
};


/**
 * Sets the style on the label
 */
var appendLabelStyle = function (elem) {
  var $elem = $(elem);

  var actionSelector = '.review-comment-contents';
  if ($elem.find(actionSelector).length === 0) {
    actionSelector = '.timeline-comment-actions';
  }

  var isFromMe = (isFiles && $elem[0].innerHTML.indexOf("/" + username + "\" class=\"author") != -1) ||
    (isDiscussion && $elem.find(actionSelector)[0].innerHTML.indexOf("/" + username + "\" class=\"author") != -1)

  var hasThumb = (isFiles && $elem[0].innerHTML.indexOf(username + " reacted with thumbs up") != -1) ||
    (isDiscussion && $elem.find(actionSelector)[0].innerHTML.indexOf(username + " reacted with thumbs up") != -1)

  if (!isFromMe && hasThumb) {
    $elem.find(actionSelector)[0].innerHTML = $elem.find(actionSelector)[0].innerHTML.replace('<span class="octicon comment-track-style comment-track-resolved"></span>', '');
    $elem.find(actionSelector)[0].innerHTML = $elem.find(actionSelector)[0].innerHTML.replace('<span class="octicon comment-track-style comment-track-unresolved"></span>', '');
    $elem.find(actionSelector).prepend('<span class="octicon comment-track-style comment-track-resolved"></span>');
  } else if (!isFromMe && (skipKeywords == "" || $elem.find(actionSelector)[0].innerHTML.match(skipKeywords) == null)) {
    $elem.find(actionSelector)[0].innerHTML = $elem.find(actionSelector)[0].innerHTML.replace('<span class="octicon comment-track-style comment-track-resolved"></span>', '');
    $elem.find(actionSelector)[0].innerHTML = $elem.find(actionSelector)[0].innerHTML.replace('<span class="octicon comment-track-style comment-track-unresolved"></span>', '');
    $elem.find(actionSelector).prepend('<span class="octicon comment-track-style comment-track-unresolved"></span>');

    var content = $elem.find(actionSelector)[0].innerText.trim()
    if (content != "") {
      unresolvedComments.add(content);
    }
  }
};


/**
 * Displays the success message
 */
var displaySuccess = function () {
  var commentStatus =
    '<div class="branch-action-item comment-track-status">' +
    '    <div class="branch-action-item-icon completeness-indicator completeness-indicator-success">' +
    '      <svg aria-hidden="true" class="octicon octicon-check" height="16" role="img" version="1.1" viewBox="0 0 16 16" width="16"><path fill-rule="evenodd" d="M12 5l-8 8-4-4 1.5-1.5L4 10l6.5-6.5z"></path></svg>' +
    '    </div>' +
    '    <h4 class="status-heading" style="color:green;">All comments are resolved</h4>' +
    '      <span class="status-meta">' +
    '        Good job!' +
    '      </span>' +
    '  </div>';

  //discussion tab
  $('#discussion_bucket').before(commentStatus);
  $('.merge-message').before(commentStatus);

  //file tab
  $('#files').before(commentStatus);
  $('#files').after(commentStatus);
}

/**
 * Displays the warning message with unresolved comments repeated
 */
var displayWarnings = function () {
  var commentStatusContent =
    '<div class="branch-action-item comment-track-status">' +
    '    <div class="branch-action-item-icon completeness-indicator completeness-indicator-problem">' +
    '      <svg aria-hidden="true" class="octicon octicon-alert" height="16" role="img" version="1.1" viewBox="0 0 16 16" width="16"><path d="M15.72 12.5l-6.85-11.98C8.69 0.21 8.36 0.02 8 0.02s-0.69 0.19-0.87 0.5l-6.85 11.98c-0.18 0.31-0.18 0.69 0 1C0.47 13.81 0.8 14 1.15 14h13.7c0.36 0 0.69-0.19 0.86-0.5S15.89 12.81 15.72 12.5zM9 12H7V10h2V12zM9 9H7V5h2V9z"></path></svg>' +
    '    </div>' +
    '    <h4 class="status-heading" style="color:red;">There are unresolved comments!</h4>' +
    '      <span class="status-meta">' +
    '        Go fix your shit!' +
    '      </span>';

  var commentStatus = commentStatusContent + "</div>";
  var commentStatusExt = commentStatusContent + '<lu><li>' + Array.from(unresolvedComments).join('</li><li>') + "</li></lu></div>"

  $("#discussion_bucket").before(commentStatus);
  $(".merge-message").before(commentStatusExt);
  $("#files").before(commentStatus);
  $("#files").after(commentStatusExt);
}
