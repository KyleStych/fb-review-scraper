const fs = require('fs');
const path = require('path');

// Check for Judge.me flag
const isJudgeMe = process.argv.includes('-jm');
if (isJudgeMe) {
  console.log('🎯 Judge.me mode enabled - converting format for import...');
}

// Function to read all JSON files from a directory
const readReviewFiles = directoryPath => {
  const files = fs.readdirSync(directoryPath);
  const jsonFiles = files.filter(file => file.endsWith('.json'));

  console.log(`Found ${jsonFiles.length} JSON files in ${directoryPath}`);

  const allReviews = [];
  const seenReviews = new Set(); // To track duplicates

  jsonFiles.forEach(file => {
    const filePath = path.join(directoryPath, file);
    console.log(`Reading ${file}`);

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const reviews = JSON.parse(fileContent);

      // Handle both array and object formats
      const reviewArray = Array.isArray(reviews) ? reviews : [reviews];

      reviewArray.forEach(review => {
        // Create a unique ID for duplicate checking
        const reviewText = review.review || '';
        const reviewId = `${review.name}_${reviewText
          .substring(0, 50)
          .replace(/[^a-zA-Z0-9]/g, '')}`;

        if (!seenReviews.has(reviewId)) {
          seenReviews.add(reviewId);

          // Convert for Judge.me if flag is enabled
          if (isJudgeMe) {
            const judgeMeReview = {
              name: review.name,
              profile: review.profile,
              body: review.review, // Change "review" to "body"
              rating: review.rating === 'Recommended' ? 5 : 1, // Convert to star rating
              id: review.id
            };
            allReviews.push(judgeMeReview);
          } else {
            allReviews.push(review);
          }
        } else {
          console.log(`Skipping duplicate review from ${file}: ${review.name}`);
        }
      });
    } catch (error) {
      console.error(`Error reading or parsing ${file}:`, error);
    }
  });

  return allReviews;
};

// Function to convert reviews to CSV format
const convertToCSV = reviews => {
  // CSV headers - adjust based on Judge.me mode
  const headers = isJudgeMe
    ? ['Name', 'Profile', 'Body', 'Rating', 'ID']
    : ['Name', 'Profile', 'Review', 'Rating', 'ID'];

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

    return [
      escapeCSV(review.name || ''),
      escapeCSV(review.profile || ''),
      escapeCSV(reviewText),
      isJudgeMe ? rating || '' : escapeCSV(rating), // Don't escape numbers in Judge.me mode
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
  : 'combined-facebook-reviews.json';
const csvOutputFileName = isJudgeMe
  ? 'judge-me-facebook-reviews.csv'
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

  if (isJudgeMe) {
    console.log(
      '📋 Judge.me format: "Recommended" → 5 stars, "review" → "body"'
    );
  }
} catch (error) {
  console.error('Failed to combine reviews:', error);
}
