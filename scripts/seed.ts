import { seedDatabase } from "../src/db.ts";
import { frenchWords } from "../data/french-words.ts";

console.log("🌱 Seeding database...");
try {
  seedDatabase(frenchWords);
  const totalWords = frenchWords.reduce((sum, cat) => sum + cat.words.length, 0);
  console.log(`✅ Seeded ${frenchWords.length} categories and ${totalWords} words.`);
} catch (err) {
  console.error("Failed to seed database:", err);
  process.exit(1);
}
