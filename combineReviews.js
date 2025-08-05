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
        // Create a unique ID for duplicate checking
        const reviewId = `${review.name}_${review.review
          .substring(0, 50)
          .replace(/[^a-zA-Z0-9]/g, '')}`;

        if (!seenReviews.has(reviewId)) {
          seenReviews.add(reviewId);
          allReviews.push(review);
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

// Main execution
const directory = './review-files'; // Directory where JSON files are stored
const outputDirectory = './combined-reviews'; // Directory to save combined output
const outputFileName = 'combined-facebook-reviews.json';

console.log('Starting review file combination...');

try {
  // Create combined-reviews directory if it doesn't exist
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
    console.log(`Created directory: ${outputDirectory}`);
  }

  const combinedReviews = readReviewFiles(directory);

  // Add metadata
  const finalOutput = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalReviews: combinedReviews.length,
      sourceDirectory: directory,
      combinedFromFiles: fs
        .readdirSync(directory)
        .filter(file => file.endsWith('.json'))
    },
    reviews: combinedReviews
  };

  const outputPath = path.join(outputDirectory, outputFileName);
  fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2), 'utf8');
  console.log(
    `Successfully combined ${combinedReviews.length} unique reviews into ${outputPath}`
  );
} catch (error) {
  console.error('Failed to combine reviews:', error);
}
