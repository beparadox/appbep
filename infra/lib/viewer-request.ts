/**
 * CloudFront Function (viewer request) source, kept in its own file so it can be tested.
 *
 * - App routes (extension-less paths like /funhouse/attic) serve /index.html (SPA fallback).
 * - Exhibits under /exhibits/ are real files. A folder URL ending in "/" serves its
 *   index.html (S3 has no directory index), and a folder URL without the slash gets
 *   redirected to add it, so the page's relative links (cube.css, img/...) resolve.
 *
 * Runs in the CloudFront JS 2.0 runtime: plain ES5-style JavaScript, no imports.
 */
export const VIEWER_REQUEST_CODE = `
function handler(event) {
  var r = event.request;
  var uri = r.uri;
  var last = uri.split('/').pop();
  if (uri.indexOf('/exhibits/') === 0) {
    if (uri.charAt(uri.length - 1) === '/') {
      r.uri = uri + 'index.html';
    } else if (last.indexOf('.') === -1) {
      return {
        statusCode: 301,
        statusDescription: 'Moved Permanently',
        headers: { location: { value: uri + '/' } },
      };
    }
    return r;
  }
  if (last.indexOf('.') === -1) {
    r.uri = '/index.html';
  }
  return r;
}`;
