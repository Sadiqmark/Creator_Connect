import { env } from '../config/env';

/**
 * Validates that a given URL string is a legitimate HTTPS image upload URL
 * originating exclusively from the configured application Cloudinary cloud.
 *
 * Uses native WHATWG URL parser to prevent regex bypasses, while allowing
 * valid Cloudinary delivery variations (transformations, versioning, subfolders).
 *
 * @param urlString The candidate URL to validate
 * @param expectedCloudName Optional cloud name override (defaults to configured env.CLOUDINARY_CLOUD_NAME)
 * @returns boolean true if valid, false otherwise
 */
export const isValidCloudinaryProfileImageUrl = (
  urlString?: string | null,
  expectedCloudName?: string
): boolean => {
  if (!urlString || typeof urlString !== 'string') {
    return false;
  }

  const trimmed = urlString.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);

    // 1. Must use HTTPS protocol exclusively
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // 2. Hostname must be exactly res.cloudinary.com
    if (parsed.hostname.toLowerCase() !== 'res.cloudinary.com') {
      return false;
    }

    // 3. Reject credentials in URL
    if (parsed.username || parsed.password) {
      return false;
    }

    // 4. Reject non-standard ports
    if (parsed.port && parsed.port !== '443') {
      return false;
    }

    // 5. Parse path segments: /<cloud-name>/<resource-type>/<delivery-type>/...
    const segments = parsed.pathname.split('/').filter(Boolean);

    // Must have at least: cloud_name, resource_type, delivery_type, and asset public_id/path
    if (segments.length < 4) {
      return false;
    }

    const [cloudName, resourceType, deliveryType] = segments;

    // 6. Cloud name must match configured application cloud name
    const targetCloudName = expectedCloudName || env.CLOUDINARY_CLOUD_NAME;
    if (cloudName !== targetCloudName) {
      return false;
    }

    // 7. Resource type must be 'image' (reject raw, video, etc.)
    if (resourceType !== 'image') {
      return false;
    }

    // 8. Delivery type must be 'upload' (reject authenticated, fetch, private, etc.)
    if (deliveryType !== 'upload') {
      return false;
    }

    return true;
  } catch {
    // Malformed URL string fails safely
    return false;
  }
};
