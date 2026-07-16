export function isCanonicalReportId(value: string) {
  return value.length > 0 && value.length <= 240 && /^[a-z0-9][a-z0-9._:-]*$/i.test(value);
}

export function decodeCanonicalReportPathSegment(value: string) {
  try {
    const decoded = decodeURIComponent(value);
    return isCanonicalReportId(decoded) ? decoded : null;
  } catch {
    return null;
  }
}
