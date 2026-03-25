const { isValidCaminho } = require("../helpers/caminho");

describe("isValidCaminho", () => {
  // Valid UNC paths
  test("accepts UNC path starting with \\\\", () => {
    expect(isValidCaminho("\\\\server\\share\\folder")).toBe(true);
  });

  // Valid web URLs
  test("accepts https:// URL", () => {
    expect(isValidCaminho("https://1drv.ms/u/s!abc123")).toBe(true);
  });

  test("accepts http:// URL", () => {
    expect(isValidCaminho("http://example.com/file")).toBe(true);
  });

  test("accepts SharePoint https URL", () => {
    expect(isValidCaminho("https://sharepoint.com/sites/team/docs")).toBe(true);
  });

  // Invalid values
  test("rejects empty string", () => {
    expect(isValidCaminho("")).toBe(false);
  });

  test("rejects plain string with no valid prefix", () => {
    expect(isValidCaminho("just-a-string")).toBe(false);
  });

  test("rejects ftp:// URL", () => {
    expect(isValidCaminho("ftp://server/file")).toBe(false);
  });

  test("rejects single backslash path", () => {
    expect(isValidCaminho("\\server\\share")).toBe(false);
  });

  test("rejects malformed https URL", () => {
    expect(isValidCaminho("https://")).toBe(false);
  });
});
