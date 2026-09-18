# Nightfall

A tiny Chrome extension: click its toolbar button to turn dark mode on or off
for the current tab. An **ON** badge shows when it is enabled. No dependencies,
build step, account, analytics, remote code, or network requests.

Originally built for Google Docs, Sheets, Drive, and Gmail, Nightfall also works
on other websites, including Jira and GitHub. Its simple CSS filter works broadly,
though results can vary by site.

The setting applies only to that tab and resets on reload or navigation. Switching
tabs or suspending the extension's background worker does not reset it. A **!**
badge means Chrome could not apply the change; hover over the button for details.

## Privacy and permissions

- `activeTab`: temporary access to a tab after you click the button, with no
  permanent access to Google apps or other websites.
- `scripting`: inserts/removes the bundled `dark.css` file. The code never calls
  `executeScript`, reads the page DOM, or collects document/email content.
- `storage`: holds only tab IDs and on/off booleans in session memory, cleared
  when Chrome restarts. Nothing is synced or saved to disk by this extension.

Chrome does not offer a CSS-only permission: `activeTab` plus `scripting` could
also allow page-reading code. This particular implementation contains none.
The complete running code is `background.js` and `dark.css`; `manifest.json`
declares its permissions and blocks extension network connections through CSP.
An unpacked copy has no store-managed automatic updates.

## Appearance and limits

This is a softened inversion filter with charcoal backgrounds and muted white
text, not a custom theme for each Google app. It is
intended to cover the UI and the canvas-rendered document or spreadsheet. It
changes only the display, not saved document formatting or outgoing email.
Print styles are unaffected.

- Photos and videos in regular HTML retain their hues with softer contrast.
  Images inside document canvases, charts, colored cells, CSS background images,
  and previews can have altered colors. Turn it off for color-sensitive work.
- Already-dark websites will be inverted too; leave the extension off there.
- Filters can affect fixed-position elements and smoothness on large documents.
- Chrome's internal pages, Chrome Web Store, and some built-in viewers cannot
  be styled. File URLs require Chrome's separate file-access setting.
- Google apps change frequently. This version has not been visually verified in
  signed-in Google apps; use the checklist below to confirm it in your account.

## Manual installation

To install directly from the source files without the Chrome Web Store:

1. Download or clone this project and unzip it if needed.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the project folder containing `manifest.json`.
5. Open Chrome's extensions menu (the puzzle piece) and pin **Nightfall**.
6. Visit a website and click the button to turn dark mode on. Click again to
   restore the page.

## Check it

Run `node --test tests/background.test.cjs` for the mocked Chrome API tests.

In Chrome, check Docs typing and scrolling, Sheets cell selection and formula
editing, Drive menus/previews, and Gmail composing/reading. Verify that clicking
twice restores the original appearance, reload clears the ON badge, another tab
is unaffected, and printing uses the original colors.
