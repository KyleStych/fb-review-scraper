const fs = require('fs');
const path = require('path');

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
        // Create a unique key for each review to detect duplicates
        const reviewKey = `${review.name}-${review.review.substring(0, 50)}`;

        if (!seenReviews.has(reviewKey)) {
          seenReviews.add(reviewKey);
          allReviews.push({
            ...review,
            sourceFile: file,
            scrapedAt: new Date().toISOString()
          });
        } else {
          console.log(`Skipped duplicate review from ${file}: ${review.name}`);
        }
      });
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
    }
  });

  return allReviews;
};

// Function to save combined reviews
const saveCombinedReviews = (reviews, outputPath) => {
  const combinedData = {
    totalReviews: reviews.length,
    scrapedAt: new Date().toISOString(),
    reviews: reviews
  };

  fs.writeFileSync(outputPath, JSON.stringify(combinedData, null, 2));
  console.log(`Combined ${reviews.length} reviews saved to ${outputPath}`);
};

// Function to generate statistics
const generateStats = reviews => {
  const stats = {
    totalReviews: reviews.length,
    uniqueReviewers: new Set(reviews.map(r => r.name)).size,
    recommendations: reviews.filter(r => r.rating === 'Recommended').length,
    notRecommended: reviews.filter(r => r.rating === 'Not Recommended').length,
    averageReviewLength: Math.round(
      reviews.reduce((sum, r) => sum + r.review.length, 0) / reviews.length
    )
  };

  console.log('\n=== Review Statistics ===');
  console.log(`Total Reviews: ${stats.totalReviews}`);
  console.log(`Unique Reviewers: ${stats.uniqueReviewers}`);
  console.log(`Recommendations: ${stats.recommendations}`);
  console.log(`Not Recommended: ${stats.notRecommended}`);
  console.log(`Average Review Length: ${stats.averageReviewLength} characters`);

  return stats;
};

// Main execution
const main = () => {
  const inputDir = './review-files'; // Directory containing your JSON files
  const outputFile = './combined-reviews.json';

  // Create input directory if it doesn't exist
  if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir, { recursive: true });
    console.log(`Created directory: ${inputDir}`);
    console.log(
      'Please place your JSON review files in this directory and run the script again.'
    );
    return;
  }

  // Read and combine all reviews
  const allReviews = readReviewFiles(inputDir);

  if (allReviews.length === 0) {
    console.log(
      'No reviews found. Make sure you have JSON files in the review-files directory.'
    );
    return;
  }

  // Generate statistics
  const stats = generateStats(allReviews);

  // Save combined file
  saveCombinedReviews(allReviews, outputFile);

  // Also save a CSV version for easy import to spreadsheets
  const csvContent = generateCSV(allReviews);
  fs.writeFileSync('./combined-reviews.csv', csvContent);
  console.log('CSV version saved to: combined-reviews.csv');
};

// Function to generate CSV for spreadsheet import
const generateCSV = reviews => {
  const headers = [
    'Name',
    'Profile',
    'Review',
    'Rating',
    'Source File',
    'Scraped At'
  ];
  const csvRows = [headers.join(',')];

  reviews.forEach(review => {
    const row = [
      `"${review.name.replace(/"/g, '""')}"`,
      `"${review.profile}"`,
      `"${review.review.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${review.rating}"`,
      `"${review.sourceFile}"`,
      `"${review.scrapedAt}"`
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  readReviewFiles,
  saveCombinedReviews,
  generateStats,
  generateCSV
};
