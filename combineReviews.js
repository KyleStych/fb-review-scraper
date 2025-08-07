const fs = require('fs');
const path = require('path');

// Check for flags
const isJudgeMe = process.argv.includes('-jm');
const isInterpolation = process.argv.includes('-int');

if (isJudgeMe) {
  console.log('🎯 Judge.me mode enabled - converting format for import...');
}
if (isInterpolation) {
  console.log('📅 Date interpolation enabled - interpolating missing dates...');
}

// Function to convert relative date to actual date
const convertRelativeDate = relativeDate => {
  if (!relativeDate) return null;

  // Handle encoded dates - we'll treat them as "recent" (within last week)
  if (relativeDate === 'date_encoded') {
    const now = new Date();
    // Set to a random day within the last week
    const randomDaysAgo = Math.floor(Math.random() * 7) + 1;
    now.setDate(now.getDate() - randomDaysAgo);
    return now.toISOString().split('T')[0];
  }

  const now = new Date();
  const dateMatch = relativeDate.match(
    /(\d+)\s+(day|days|week|weeks|month|months|year|years)\s+ago/
  );
  if (dateMatch) {
    const amount = parseInt(dateMatch[1]);
    const unit = dateMatch[2];
    const date = new Date(now);

    switch (unit) {
      case 'day':
      case 'days':
        date.setDate(date.getDate() - amount);
        break;
      case 'week':
      case 'weeks':
        date.setDate(date.getDate() - amount * 7);
        break;
      case 'month':
      case 'months':
        date.setMonth(date.getMonth() - amount);
        break;
      case 'year':
      case 'years':
        date.setFullYear(date.getFullYear() - amount);
        break;
    }
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
  return null;
};

// Function to interpolate dates between known dates
const interpolateDates = reviews => {
  console.log('🔄 Interpolating dates for reviews without dates...');

  // First pass: convert all relative dates to interpolated dates
  const reviewsWithDates = reviews.map(review => ({
    ...review,
    interpolatedDate: convertRelativeDate(review.originalDate || review.date)
  }));

  // Find all reviews with valid dates and sort them
  const reviewsWithValidDates = reviewsWithDates
    .filter(review => review.interpolatedDate)
    .sort(
      (a, b) => new Date(a.interpolatedDate) - new Date(b.interpolatedDate)
    );

  console.log(
    `📅 Found ${reviewsWithValidDates.length} reviews with valid dates`
  );

  // Debug: Show what types of dates we found
  const dateTypes = reviewsWithDates.reduce(
    (acc, review) => {
      if (review.date === 'date_encoded') acc.encoded++;
      else if (review.date && review.date.includes('ago')) acc.relative++;
      else if (review.date) acc.other++;
      else acc.none++;
      return acc;
    },
    { encoded: 0, relative: 0, other: 0, none: 0 }
  );

  console.log(
    `📊 Date breakdown: ${dateTypes.encoded} encoded, ${dateTypes.relative} relative, ${dateTypes.other} other, ${dateTypes.none} none`
  );

  if (reviewsWithValidDates.length < 2) {
    console.log(
      '⚠️ Need at least 2 reviews with dates to interpolate. Using fallback dates.'
    );
    // If we don't have enough dates, use a simple fallback
    let fallbackDate = new Date();
    return reviewsWithDates.map(review => {
      if (!review.interpolatedDate) {
        fallbackDate.setDate(fallbackDate.getDate() - 1); // Move back one day
        review.interpolatedDate = fallbackDate.toISOString().split('T')[0];
      }
      return review;
    });
  }

  // Preserve original order for interpolation (don't sort by date)
  const reviewsInOriginalOrder = reviewsWithDates;

  // Interpolate dates for reviews without dates
  let interpolatedReviews = [];
  let lastKnownDate = null;
  let nextKnownDate = null;
  let reviewsWithoutDates = [];

  for (let i = 0; i < reviewsInOriginalOrder.length; i++) {
    const review = reviewsInOriginalOrder[i];

    if (review.interpolatedDate) {
      // This review has a date, so we can interpolate any pending reviews
      if (reviewsWithoutDates.length > 0 && lastKnownDate) {
        const daysBetween = Math.floor(
          (new Date(review.interpolatedDate) - new Date(lastKnownDate)) /
            (1000 * 60 * 60 * 24)
        );
        const daysPerReview = Math.floor(
          daysBetween / (reviewsWithoutDates.length + 1)
        );

        let currentDate = new Date(lastKnownDate);
        for (let j = 0; j < reviewsWithoutDates.length; j++) {
          currentDate.setDate(currentDate.getDate() + daysPerReview);
          reviewsWithoutDates[j].interpolatedDate = currentDate
            .toISOString()
            .split('T')[0];
          interpolatedReviews.push(reviewsWithoutDates[j]);
        }
        reviewsWithoutDates = [];
      }

      lastKnownDate = review.interpolatedDate;
      interpolatedReviews.push(review);
    } else {
      // This review needs date interpolation
      reviewsWithoutDates.push(review);
    }
  }

  // Handle any remaining reviews without dates (after the last known date)
  if (reviewsWithoutDates.length > 0 && lastKnownDate) {
    let currentDate = new Date(lastKnownDate);
    for (let review of reviewsWithoutDates) {
      currentDate.setDate(currentDate.getDate() - 1); // Subtract one day (go backwards)
      review.interpolatedDate = currentDate.toISOString().split('T')[0];
      interpolatedReviews.push(review);
    }
  } else if (reviewsWithoutDates.length > 0) {
    // No known dates at all, use fallback
    let fallbackDate = new Date();
    for (let review of reviewsWithoutDates) {
      fallbackDate.setDate(fallbackDate.getDate() - 1);
      review.interpolatedDate = fallbackDate.toISOString().split('T')[0];
      interpolatedReviews.push(review);
    }
  }

  console.log(
    `✅ Interpolated dates for ${reviewsWithoutDates.length} reviews`
  );
  return interpolatedReviews;
};

// Function to extract review numbers from filename
const extractReviewNumbers = filename => {
  // Extract numbers from filename like "facebook-reviews-001-030-1234567890.json"
  const match = filename.match(/facebook-reviews-(\d+)-(\d+)-/);
  if (match) {
    return {
      start: parseInt(match[1]),
      end: parseInt(match[2]),
      filename: filename
    };
  }
  return null;
};

// Function to read all JSON files from a directory
const readReviewFiles = directoryPath => {
  const files = fs.readdirSync(directoryPath);
  const jsonFiles = files.filter(file => file.endsWith('.json'));

  console.log(`Found ${jsonFiles.length} JSON files in ${directoryPath}`);

  // Sort files by review numbers (most recent first for Judge.me)
  const sortedFiles = jsonFiles
    .map(file => {
      const numbers = extractReviewNumbers(file);
      return numbers
        ? { ...numbers, filename: file }
        : { start: 0, end: 0, filename: file };
    })
    .sort((a, b) => {
      // Sort by start number in ascending order (first scraped = newest = first)
      return a.start - b.start;
    });

  console.log(
    '📊 Processing files in chronological order (first scraped = newest first):'
  );
  sortedFiles.forEach((file, index) => {
    console.log(
      `  ${index + 1}. ${file.filename} (reviews ${file.start}-${file.end})`
    );
  });

  const allReviews = [];
  const seenReviews = new Set(); // To track duplicates

  sortedFiles.forEach((fileInfo, fileIndex) => {
    const filePath = path.join(directoryPath, fileInfo.filename);
    console.log(
      `Reading ${fileInfo.filename} (reviews ${fileInfo.start}-${fileInfo.end})`
    );

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const reviews = JSON.parse(fileContent);

      // Handle both array and object formats
      const reviewArray = Array.isArray(reviews) ? reviews : [reviews];

      reviewArray.forEach((review, reviewIndex) => {
        // Create a unique ID for duplicate checking
        const reviewText = review.review || '';
        const reviewId = `${review.name}_${reviewText
          .substring(0, 50)
          .replace(/[^a-zA-Z0-9]/g, '')}`;

        if (!seenReviews.has(reviewId)) {
          seenReviews.add(reviewId);

          // Add file order information for proper sorting
          const reviewWithOrder = {
            ...review,
            _fileOrder: fileIndex,
            _reviewOrder: reviewIndex
          };

          // Convert for Judge.me if flag is enabled
          if (isJudgeMe) {
            const judgeMeReview = {
              name: review.name,
              profile: review.profile,
              body: review.review, // Change "review" to "body"
              rating: review.rating === 'Recommended' ? 5 : 1, // Convert to star rating
              originalDate: review.date, // Keep original date for interpolation
              id: review.id,
              _fileOrder: fileIndex,
              _reviewOrder: reviewIndex
            };
            allReviews.push(judgeMeReview);
          } else {
            allReviews.push(reviewWithOrder);
          }
        } else {
          console.log(
            `Skipping duplicate review from ${fileInfo.filename}: ${review.name}`
          );
        }
      });
    } catch (error) {
      console.error(`Error reading or parsing ${fileInfo.filename}:`, error);
    }
  });

  // Sort reviews by file order and review order (first scraped = newest first)
  allReviews.sort((a, b) => {
    // First sort by file order (ascending - first scraped files have lower indices)
    if (a._fileOrder !== b._fileOrder) {
      return a._fileOrder - b._fileOrder;
    }
    // Then sort by review order within the file
    return a._reviewOrder - b._reviewOrder;
  });

  // Remove the temporary order fields
  allReviews.forEach(review => {
    delete review._fileOrder;
    delete review._reviewOrder;
  });

  // If Judge.me mode or interpolation flag, interpolate dates
  if (isJudgeMe || isInterpolation) {
    return interpolateDates(allReviews);
  }

  return allReviews;
};

// Function to convert reviews to CSV format
const convertToCSV = reviews => {
  // CSV headers - adjust based on Judge.me mode
  const headers = isJudgeMe
    ? ['Name', 'Profile', 'Body', 'Rating', 'Date', 'ID']
    : ['Name', 'Profile', 'Review', 'Rating', 'Date', 'ID'];

  // Convert each review to CSV row
  const csvRows = reviews.map(review => {
    // Escape quotes and wrap in quotes if contains comma or newline
    const escapeCSV = text => {
      if (!text || typeof text !== 'string') return '';
      const escaped = text.replace(/"/g, '""');
      if (
        escaped.includes(',') ||
        escaped.includes('\n') ||
        escaped.includes('"')
      ) {
        return `"${escaped}"`;
      }
      return escaped;
    };

    // Use appropriate field names based on mode
    const reviewText = isJudgeMe ? review.body || '' : review.review || '';
    const rating = isJudgeMe ? review.rating || '' : review.rating || '';
    const date =
      isJudgeMe || isInterpolation
        ? review.interpolatedDate || review.originalDate || review.date || ''
        : review.originalDate || review.date || '';

    return [
      escapeCSV(review.name || ''),
      escapeCSV(review.profile || ''),
      escapeCSV(reviewText),
      isJudgeMe ? rating || '' : escapeCSV(rating), // Don't escape numbers in Judge.me mode
      escapeCSV(date),
      escapeCSV(review.id || '')
    ].join(',');
  });

  // Combine headers and rows
  return [headers.join(','), ...csvRows].join('\n');
};

// Main execution
const directory = './review-files'; // Directory where JSON files are stored
const outputDirectory = './combined-reviews'; // Directory to save combined output
const jsonOutputFileName = isJudgeMe
  ? 'judge-me-facebook-reviews.json'
  : isInterpolation
  ? 'interpolated-facebook-reviews.json'
  : 'combined-facebook-reviews.json';
const csvOutputFileName = isJudgeMe
  ? 'judge-me-facebook-reviews.csv'
  : isInterpolation
  ? 'interpolated-facebook-reviews.csv'
  : 'combined-facebook-reviews.csv';

console.log('Starting review file combination...');

try {
  // Create combined-reviews directory if it doesn't exist
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
    console.log(`Created directory: ${outputDirectory}`);
  }

  const combinedReviews = readReviewFiles(directory);

  // Add metadata for JSON
  const finalOutput = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalReviews: combinedReviews.length,
      sourceDirectory: directory,
      combinedFromFiles: fs
        .readdirSync(directory)
        .filter(file => file.endsWith('.json')),
      format: isJudgeMe ? 'judge-me' : 'standard'
    },
    reviews: combinedReviews
  };

  // Save JSON file
  const jsonOutputPath = path.join(outputDirectory, jsonOutputFileName);
  fs.writeFileSync(
    jsonOutputPath,
    JSON.stringify(finalOutput, null, 2),
    'utf8'
  );
  console.log(`✅ Saved JSON: ${jsonOutputPath}`);

  // Save CSV file
  const csvOutputPath = path.join(outputDirectory, csvOutputFileName);
  const csvContent = convertToCSV(combinedReviews);
  fs.writeFileSync(csvOutputPath, csvContent, 'utf8');
  console.log(`✅ Saved CSV: ${csvOutputPath}`);

  console.log(
    `🎉 Successfully combined ${combinedReviews.length} unique reviews into both formats!`
  );
  console.log(
    '📋 Reviews are ordered by collection time (first scraped = newest first) for optimal display'
  );

  if (isJudgeMe) {
    console.log(
      '📋 Judge.me format: "Recommended" → 5 stars, "review" → "body"'
    );
  } else if (isInterpolation) {
    console.log(
      '📋 Interpolation mode: Dates interpolated while preserving original format'
    );
  }
} catch (error) {
  console.error('Failed to combine reviews:', error);
}
