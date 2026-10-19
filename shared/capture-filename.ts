export function createCaptureFilename(site: string, date = new Date()): string {
  const host = site ? new URL(site).hostname.replace(/[^a-z\d.-]/gi, '-') : 'page';
  const timestamp = date.toISOString().replace(/[:.]/g, '-');
  return `smart-snap-${host}-${timestamp}.png`;
}
