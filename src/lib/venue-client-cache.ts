// Shared browser request. Hovering a hall card can warm this before navigation.
const venueDetails = new Map<string, { promise: Promise<unknown>; expires: number }>();

export function getVenueDetail<T>(slug: string): Promise<T> {
  const cached = venueDetails.get(slug);
  if (cached && cached.expires > Date.now()) return cached.promise as Promise<T>;
  const promise = fetch(`/api/wedding-halls/${encodeURIComponent(slug)}`)
    .then(response => {
      if (!response.ok) throw new Error('Wedding hall could not be loaded');
      return response.json() as Promise<T>;
    })
    .catch(error => { venueDetails.delete(slug); throw error; });
  venueDetails.set(slug, { promise, expires: Date.now() + 30_000 });
  return promise;
}

export function prefetchVenueDetail(slug: string) {
  void getVenueDetail(slug).catch(() => {});
}
