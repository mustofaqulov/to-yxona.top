// Saved venues use a timestamp and UUID; demo IDs are hall-1, hall-2, etc.
export function isStoredVenueId(id: string): boolean {
  return /^hall-\d{13}-[a-f0-9-]{36}$/.test(id);
}
