// =============================================================================
// Apex PL — FPL Asset URL Builders
// =============================================================================
//
// Official Premier League photo URLs for player headshots.
// These URLs are reliable and always available for all FPL players.
//

/**
 * Build official FPL player photo URL from photo code
 * 
 * FPL provides player photos in the format "123456.jpg" in the bootstrap data.
 * The official PL CDN serves these as PNG files.
 * 
 * @param photo - Photo code from FPL element (e.g., "123456.jpg")
 * @returns Official Premier League CDN URL or null if no photo
 * 
 * @example
 * getFplPlayerPhotoUrl("123456.jpg")
 * // Returns: "https://resources.premierleague.com/premierleague/photos/players/250x250/p123456.png"
 */
export function getFplPlayerPhotoUrl(photo: string | null | undefined): string | null {
  if (!photo) return null;
  
  // Remove .jpg extension to get the code
  const code = photo.replace(/\.jpg$/i, "");
  
  // Return official PL CDN URL (250x250 is the standard size)
  return `https://resources.premierleague.com/premierleague/photos/players/250x250/p${code}.png`;
}

/**
 * Build FPL player photo URL with fallback
 * Returns a guaranteed string (fallback to empty string for img src)
 */
export function getFplPlayerPhotoUrlSafe(photo: string | null | undefined): string {
  return getFplPlayerPhotoUrl(photo) ?? "";
}
