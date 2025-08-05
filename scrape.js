const getReviews = query => {
  const reviewCards = document.querySelectorAll(query);
  console.log('Review cards found: ', reviewCards.length);
  let reviews = [];

  reviewCards.forEach(card => {
    // Look for the heading that contains the reviewer name and recommendation
    const headingElems = card.querySelectorAll(
      '[data-ad-rendering-role="profile_name"] b'
    );

    if (
      headingElems.length >= 2 &&
      headingElems[1].textContent.includes('recommends')
    ) {
      // Get the reviewer name (first b element)
      const reviewerName = headingElems[0].textContent.trim();

      // Get the profile link (first a tag within the heading)
      const profileLink = card.querySelector(
        '[data-ad-rendering-role="profile_name"] a'
      ).href;

      // Remove query string from href
      const profileUrl = new URL(profileLink);
      const cleanProfileLink = profileUrl.origin + profileUrl.pathname;

      // Get the review text - look for the main content div
      const reviewTextElement = card.querySelector(
        '[dir="auto"] div[dir="auto"]'
      );
      const reviewText = reviewTextElement
        ? reviewTextElement.textContent.trim()
        : '';

      // Get rating/recommendation status
      const rating = headingElems[1].textContent.includes('recommends')
        ? 'Recommended'
        : 'Not Recommended';

      let review = {
        name: reviewerName,
        profile: cleanProfileLink,
        review: reviewText,
        rating: rating
      };
      reviews.push(review);
    }
  });

  return reviews;
};

// New approach: Find review cards using aria-hidden="true" markers
const findReviewCardsByMarkers = (debug = false) => {
  if (debug)
    console.log('=== Finding Review Cards by Markers (DEBUG MODE) ===');
  else console.log('=== Finding Review Cards by Markers ===');

  // Find all aria-hidden="true" divs
  const hiddenDivs = document.querySelectorAll('div[aria-hidden="true"]');
  console.log(`Found ${hiddenDivs.length} aria-hidden="true" divs`);

  const reviewCards = [];

  // Look for actual review content instead of just dummy elements
  const storyMessages = document.querySelectorAll(
    '[data-ad-rendering-role="story_message"]'
  );
  console.log(`Found ${storyMessages.length} story messages`);

  if (debug) {
    console.log('=== DEBUG: Checking each story message ===');
  }

  storyMessages.forEach((storyMessage, index) => {
    if (debug) {
      console.log(`\n--- Story Message ${index + 1} ---`);
      console.log('Story message element:', storyMessage);
      console.log(
        'Story message text preview:',
        storyMessage.textContent.substring(0, 100)
      );
    }

    // Find the parent container that contains both profile and story content
    let parent = storyMessage;
    let foundReviewCard = false;

    // Walk up the DOM tree to find the review card container
    for (let i = 0; i < 10 && parent && !foundReviewCard; i++) {
      // Check if this parent contains both profile name and story message
      const hasProfile = parent.querySelector(
        '[data-ad-rendering-role="profile_name"]'
      );
      const hasStory = parent.querySelector(
        '[data-ad-rendering-role="story_message"]'
      );

      if (debug && i < 3) {
        console.log(
          `Level ${i}: hasProfile=${!!hasProfile}, hasStory=${!!hasStory}`
        );
      }

      if (hasProfile && hasStory) {
        reviewCards.push(parent);
        foundReviewCard = true;
        console.log(`Found review card ${index + 1} at level ${i}`);
      }

      parent = parent.parentElement;
    }

    if (debug && !foundReviewCard) {
      console.log(`❌ No review card found for story message ${index + 1}`);
    }
  });

  console.log(`Found ${reviewCards.length} potential review cards`);

  if (debug) {
    console.log('=== DEBUG: Review cards found ===');
    reviewCards.forEach((card, index) => {
      const profileElement = card.querySelector(
        '[data-ad-rendering-role="profile_name"]'
      );
      const storyElement = card.querySelector(
        '[data-ad-rendering-role="story_message"]'
      );
      console.log(
        `Card ${
          index + 1
        }: profile=${!!profileElement}, story=${!!storyElement}`
      );
    });
  }

  return reviewCards;
};

// Watch for dynamically loaded reviews
const watchForNewReviews = callback => {
  console.log('=== Setting up review watcher ===');

  // Store initial count
  let initialReviewCount = findReviewCardsByMarkers().length;
  console.log(`Initial review count: ${initialReviewCount}`);

  // Set up observer to watch for new content
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        // Check if new review cards were added
        const currentReviewCount = findReviewCardsByMarkers().length;

        if (currentReviewCount > initialReviewCount) {
          console.log(`New reviews detected! Count: ${currentReviewCount}`);
          initialReviewCount = currentReviewCount;

          // Call the callback with new reviews
          if (callback) {
            callback();
          }
        }
      }
    });
  });

  // Start observing the document body
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('Review watcher active - scroll to load more reviews');
  return observer;
};

// Enhanced scraping function using the marker approach
const scrapeReviewsWithMarkers = () => {
  const reviewCards = findReviewCardsByMarkers();
  console.log(`Scraping ${reviewCards.length} review cards`);

  let reviews = [];
  let duplicatesFound = 0;

  reviewCards.forEach((card, index) => {
    console.log(`Processing card ${index + 1}`);

    // Look for the story message content (actual review text)
    const storyMessage = card.querySelector(
      '[data-ad-rendering-role="story_message"]'
    );

    if (storyMessage) {
      console.log('Found story message');

      // Get the review text from the story message
      const reviewTextElement = storyMessage.querySelector(
        '[dir="auto"] div[dir="auto"]'
      );
      const reviewText = reviewTextElement
        ? reviewTextElement.textContent.trim()
        : '';
      console.log(`Review text: ${reviewText.substring(0, 100)}...`);

      // Look for profile information
      const profileNameElement = card.querySelector(
        '[data-ad-rendering-role="profile_name"]'
      );

      if (profileNameElement) {
        // Get the reviewer name from the profile section
        const nameElement = profileNameElement.querySelector('a');
        const reviewerName = nameElement
          ? nameElement.textContent.trim()
          : 'Unknown';
        console.log(`Reviewer: ${reviewerName}`);

        // Get the profile link
        const profileLink = nameElement ? nameElement.href : '';

        // Remove query string from href
        let cleanProfileLink = '';
        if (profileLink) {
          try {
            const profileUrl = new URL(profileLink);
            cleanProfileLink = profileUrl.origin + profileUrl.pathname;
          } catch (e) {
            cleanProfileLink = profileLink;
          }
        }

        // Check if this is a recommendation (look for "recommends" text)
        const profileText = profileNameElement.textContent;
        const isRecommendation =
          profileText.includes('recommends') ||
          profileText.includes('is with') ||
          reviewText.toLowerCase().includes('recommend');

        const rating = isRecommendation ? 'Recommended' : 'Not Recommended';

        // Create a unique identifier for this review
        const reviewId = `${reviewerName}_${reviewText
          .substring(0, 50)
          .replace(/[^a-zA-Z0-9]/g, '')}`;

        // Check if this review already exists in the current batch
        const isDuplicate = reviews.some(existingReview => {
          // Check by name first
          if (existingReview.name === reviewerName) {
            // If same name, check if review content is similar
            const existingStart = existingReview.review.substring(0, 50);
            const newStart = reviewText.substring(0, 50);
            return existingStart === newStart;
          }
          return false;
        });

        if (isDuplicate) {
          console.log(`⚠️ Skipping duplicate review for: ${reviewerName}`);
          duplicatesFound++;
        } else {
          let review = {
            name: reviewerName,
            profile: cleanProfileLink,
            review: reviewText,
            rating: rating,
            id: reviewId
          };
          reviews.push(review);
          console.log(`Added review for: ${reviewerName}`);
        }
      } else {
        console.log('No profile name found');
      }
    } else {
      console.log('No story message found');
    }
  });

  console.log(
    `Successfully scraped ${reviews.length} reviews (${duplicatesFound} duplicates skipped)`
  );
  return reviews;
};

// Helper function to find the correct selectors
const findReviewSelectors = () => {
  console.log('=== Testing Different Selectors ===');

  // Try different approaches
  const selectors = [
    // Attribute-based selectors (more stable)
    '[data-ad-rendering-role="profile_name"]',
    '[aria-posinset]',
    '[data-virtualized="false"]',
    'blockquote',

    // Class-based selectors (less stable but worth trying)
    '.x1yztbdb',
    '.x1a2a7pz',
    '.html-div',

    // More specific combinations
    'div[class*="x1yztbdb"]',
    'div[class*="x1a2a7pz"]',
    'div[class*="html-div"]'
  ];

  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`${selector}: ${elements.length} elements found`);

    if (elements.length > 0) {
      // Check if any contain review-like content
      let reviewCount = 0;
      elements.forEach(el => {
        if (
          el.textContent.includes('recommends') ||
          el.textContent.includes('Facebook')
        ) {
          reviewCount++;
        }
      });
      console.log(`  - ${reviewCount} potential review elements`);
    }
  });

  console.log('=== End Selector Test ===');
};

// Export all functions
window.getReviews = getReviews;
window.findReviewSelectors = findReviewSelectors;
window.findReviewCardsByMarkers = findReviewCardsByMarkers;
window.scrapeReviewsWithMarkers = scrapeReviewsWithMarkers;
window.watchForNewReviews = watchForNewReviews;

// Add download function for saving reviews
const downloadReviews = (
  reviews,
  filename = 'facebook-reviews.json',
  startIndex = 1
) => {
  const dataStr = JSON.stringify(reviews, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = filename;
  link.click();

  URL.revokeObjectURL(link.href);
  console.log(`Reviews downloaded as: ${filename}`);
};

// Add copy to clipboard function
const copyReviewsToClipboard = reviews => {
  const jsonString = JSON.stringify(reviews, null, 2);
  navigator.clipboard
    .writeText(jsonString)
    .then(() => {
      console.log('Reviews copied to clipboard!');
    })
    .catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
};

// Batched download function that waits for X reviews before downloading
const watchForBatchedReviews = (
  batchSize = 20,
  callback = null,
  debug = false,
  autoScroll = false
) => {
  console.log(
    `=== Setting up batched review watcher (${batchSize} reviews per batch) ===`
  );
  if (autoScroll) console.log('🔄 Auto-scroll mode enabled');

  let allReviews = [];
  let lastDownloadCount = 0;
  let globalReviewIds = new Set(); // Track all reviews ever seen
  let scrollCount = 0;
  let isScrolling = false;
  let noNewReviewsCount = 0;
  let lastScrollPosition = 0;
  let isProcessingReviews = false; // Prevent double processing
  let consecutiveNoNewElementsCount = 0; // Track when no new elements are added
  let lastElementCount = 0; // Track total elements on page

  // Function to check if new elements are being added
  const checkForNewElements = () => {
    const currentElementCount = document.querySelectorAll(
      '[data-ad-rendering-role="story_message"]'
    ).length;

    if (currentElementCount === lastElementCount) {
      consecutiveNoNewElementsCount++;
      console.log(
        `📊 No new elements detected (attempt ${consecutiveNoNewElementsCount}/3)`
      );

      if (consecutiveNoNewElementsCount >= 3) {
        console.log(
          '🏁 No new elements added for 3 consecutive checks - reached end of reviews'
        );
        return true; // End detected
      }
    } else {
      consecutiveNoNewElementsCount = 0; // Reset counter when new elements found
      console.log(
        `📊 New elements detected: ${currentElementCount} total (was ${lastElementCount})`
      );
    }

    lastElementCount = currentElementCount;
    return false; // Continue
  };

  // Function to process new reviews
  const processNewReviews = reviews => {
    if (isProcessingReviews) return;
    isProcessingReviews = true;

    // Filter out duplicates based on global tracking
    const newReviews = reviews.filter(review => {
      if (globalReviewIds.has(review.id)) {
        console.log(`🔄 Skipping already seen review: ${review.name}`);
        return false;
      } else {
        globalReviewIds.add(review.id);
        return true;
      }
    });

    if (newReviews.length > 0) {
      // Add new reviews to the collection
      allReviews = [...allReviews, ...newReviews];
      console.log(`Total unique reviews collected: ${allReviews.length}`);
      noNewReviewsCount = 0; // Reset counter when we find new reviews
    } else {
      console.log('No new unique reviews found');
    }

    // Check if we've reached the batch size (check every time, not just when new reviews are found)
    const newReviewsInBatch = allReviews.length - lastDownloadCount;
    if (newReviewsInBatch >= batchSize) {
      const batchReviews = allReviews.slice(lastDownloadCount);
      const timestamp = Date.now();
      const startReview = lastDownloadCount + 1;
      const endReview = allReviews.length;
      const filename = `facebook-reviews-${String(startReview).padStart(
        3,
        '0'
      )}-${String(endReview).padStart(3, '0')}-${timestamp}.json`;

      console.log(
        `📦 Batch ready! Downloading ${batchReviews.length} reviews (${startReview}-${endReview})...`
      );
      downloadReviews(batchReviews, filename);
      lastDownloadCount = allReviews.length;

      if (callback) {
        callback(batchReviews, allReviews.length);
      }
    }

    isProcessingReviews = false;
  };

  // Auto-scroll function
  const performAutoScroll = () => {
    if (isScrolling) return;

    isScrolling = true;
    scrollCount++;

    console.log(`📜 Auto-scrolling (attempt ${scrollCount})...`);

    // Store current scroll position
    lastScrollPosition = window.pageYOffset;

    // Scroll down by 2 page heights
    const scrollHeight = window.innerHeight * 2;
    window.scrollBy(0, scrollHeight);

    // Wait a bit for content to load, then check for new reviews
    setTimeout(() => {
      isScrolling = false;

      // Check if we actually scrolled (to detect end of page)
      const currentPosition = window.pageYOffset;
      const scrollDistance = currentPosition - lastScrollPosition;

      // Check if new elements are being added to the page
      const endDetected = checkForNewElements();

      // Check if we found new reviews after scrolling
      const currentReviews = scrapeReviewsWithMarkers();

      if (currentReviews.length > 0) {
        console.log('✅ New reviews found after scroll, continuing...');
        processNewReviews(currentReviews);

        // Continue scrolling after a short delay
        if (autoScroll && !endDetected) {
          setTimeout(performAutoScroll, 2000);
        } else if (endDetected) {
          console.log('🛑 Stopping auto-scroll - reached end of reviews');
        }
      } else {
        noNewReviewsCount++;
        console.log(
          `⚠️ No new reviews found after scroll (attempt ${noNewReviewsCount})`
        );

        // If we haven't scrolled much, we might be at the end
        if (scrollDistance < 100) {
          console.log('🏁 Reached end of page - stopping auto-scroll');
          return;
        }

        // Continue scrolling even if no new reviews found (up to 3 attempts)
        if (autoScroll && noNewReviewsCount < 3 && !endDetected) {
          setTimeout(performAutoScroll, 3000);
        } else if (noNewReviewsCount >= 3 || endDetected) {
          console.log(
            '🛑 Stopping auto-scroll after 3 attempts with no new reviews or end detected'
          );
        }
      }
    }, 3000); // Wait 3 seconds for content to load
  };

  // Set up observer to watch for new content
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && !isScrolling) {
        // Only process if we're not currently auto-scrolling
        const currentReviews = scrapeReviewsWithMarkers();
        if (currentReviews.length > 0) {
          processNewReviews(currentReviews);
        }
      }
    });
  });

  // Start observing the document body
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log(
    `Review watcher active - will download every ${batchSize} reviews`
  );
  if (autoScroll) {
    console.log(
      '🔄 Auto-scroll mode: Will automatically scroll to load more reviews'
    );

    // Initial scan of existing content before starting auto-scroll
    console.log('🔍 Performing initial scan of existing page content...');
    const initialReviews = scrapeReviewsWithMarkers();
    if (initialReviews.length > 0) {
      console.log(
        `📋 Found ${initialReviews.length} reviews on initial page scan`
      );
      processNewReviews(initialReviews);
    } else {
      console.log('📋 No reviews found in initial page scan');
    }

    // Start auto-scrolling after a short delay
    setTimeout(performAutoScroll, 2000);
  } else {
    console.log('📜 Manual scroll mode: Scroll down to load more reviews...');
  }

  return {
    observer,
    getCurrentReviews: () => allReviews,
    getBatchCount: () => allReviews.length - lastDownloadCount,
    getGlobalCount: () => globalReviewIds.size,
    getScrollCount: () => scrollCount,
    getNoNewReviewsCount: () => noNewReviewsCount,
    getEndDetectionStatus: () => ({
      consecutiveNoNewElements: consecutiveNoNewElementsCount,
      lastElementCount: lastElementCount,
      endDetected: consecutiveNoNewElementsCount >= 3
    }),
    forceDownload: () => {
      const remainingReviews = allReviews.slice(lastDownloadCount);
      if (remainingReviews.length > 0) {
        const timestamp = Date.now();
        const startReview = lastDownloadCount + 1;
        const endReview = allReviews.length;
        const filename = `facebook-reviews-${String(startReview).padStart(
          3,
          '0'
        )}-${String(endReview).padStart(3, '0')}-remaining-${timestamp}.json`;
        downloadReviews(remainingReviews, filename);
        lastDownloadCount = allReviews.length;
      }
    },
    resetGlobalTracking: () => {
      globalReviewIds.clear();
      console.log('🔄 Reset global review tracking');
    },
    // Manual scroll function
    manualScroll: () => {
      if (!isScrolling) {
        performAutoScroll();
      }
    },
    // Stop auto-scrolling
    stopAutoScroll: () => {
      isScrolling = false;
      console.log('⏹️ Auto-scroll stopped');
    },
    // Restart auto-scrolling
    restartAutoScroll: () => {
      noNewReviewsCount = 0;
      consecutiveNoNewElementsCount = 0; // Reset end detection
      console.log('🔄 Restarting auto-scroll...');
      setTimeout(performAutoScroll, 1000);
    }
  };
};

// Export download functions
window.downloadReviews = downloadReviews;
window.copyReviewsToClipboard = copyReviewsToClipboard;
window.watchForBatchedReviews = watchForBatchedReviews;

// Simple one-function startup for scraping
const scrapeInit = (batchSize = 30, debug = false, autoScroll = true) => {
  console.log('🚀 Starting Facebook Review Scraper...');
  console.log(`📦 Batch size: ${batchSize} reviews per download`);
  if (debug) console.log('🐛 DEBUG MODE ENABLED');
  if (autoScroll) console.log('🔄 AUTO-SCROLL MODE ENABLED');
  console.log('📜 Scroll down to load more reviews...');

  // Set up the batched watcher with a simple callback
  const batcher = watchForBatchedReviews(
    batchSize,
    (batch, total) => {
      console.log(
        `✅ Downloaded ${batch.length} reviews (${total} total collected)`
      );
    },
    debug,
    autoScroll
  );

  // Return the batcher object for manual control
  return {
    ...batcher,
    // Add some convenience methods
    getStatus: () => {
      const current = batcher.getCurrentReviews();
      const inBatch = batcher.getBatchCount();
      const globalCount = batcher.getGlobalCount();
      const scrollCount = batcher.getScrollCount();
      const noNewReviewsCount = batcher.getNoNewReviewsCount();
      const endStatus = batcher.getEndDetectionStatus();
      console.log(
        `📊 Status: ${current.length} total reviews, ${inBatch} in current batch, ${globalCount} unique reviews tracked, ${scrollCount} scrolls performed, ${noNewReviewsCount} attempts with no new reviews, ${endStatus.consecutiveNoNewElements}/3 consecutive no-new-elements checks`
      );
      if (endStatus.endDetected) {
        console.log('🏁 End of reviews detected!');
      }
      return {
        total: current.length,
        inBatch,
        globalCount,
        scrollCount,
        noNewReviewsCount,
        endDetected: endStatus.endDetected,
        consecutiveNoNewElements: endStatus.consecutiveNoNewElements
      };
    },
    downloadRemaining: () => {
      console.log('📥 Downloading remaining reviews...');
      batcher.forceDownload();
    },
    stop: () => {
      console.log('⏹️ Stopping scraper...');
      batcher.observer.disconnect();
      if (autoScroll) {
        batcher.stopAutoScroll();
      }
    },
    // Add debug method
    debug: () => {
      console.log('🔍 Running debug scan...');
      findReviewCardsByMarkers(true);
    },
    // Add method to reset tracking (useful if you want to start fresh)
    resetTracking: () => {
      batcher.resetGlobalTracking();
    },
    // Manual scroll trigger
    scroll: () => {
      batcher.manualScroll();
    },
    // Restart auto-scroll if it stopped
    restartScroll: () => {
      if (autoScroll) {
        batcher.restartAutoScroll();
      } else {
        console.log('Auto-scroll not enabled');
      }
    }
  };
};

// Export the simple startup function
window.scrapeInit = scrapeInit;
