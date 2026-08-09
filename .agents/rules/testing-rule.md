# Comprehensive Testing with Playwright

Whenever the user includes the `/goal` command in their prompt, or when verifying a complex feature, you MUST:
1. Use Playwright (via the Playwright MCP or automated test scripts) to completely check the entire design to verify if the solution worked.
2. Do not just check the specific area where the code was targeted. You must check the entire function of the website to ensure the change didn't alter or break any other functionality.
3. Take as long as it needs to check the entire website. There is no time limit for this verification.
4. Utilize available MCP servers (like playwright, github, filesystem) as best as possible to assist in testing and verification.
5. **CRITICAL - PREVENT SILENT FAILURES:** When running Playwright scripts, you MUST capture and monitor the browser's console logs (e.g., `page.on('console', msg => console.log('BROWSER:', msg.text()))`) and network errors.
6. **VERIFY OUTCOMES, NOT JUST SELECTORS:** Do not assume a test passed just because an element exists or didn't crash. For example, if checking an AI image render, ensure the `src` attribute actually contains the newly generated data (like a long base64 string) rather than just falling back to a placeholder or the original image. Actively investigate console logs for silent API errors that the UI might be masking.
