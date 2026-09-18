# Nightfall

A tiny Chrome extension: click its toolbar button to turn dark mode on or off
for the current site, or globally. An **ON** badge shows when it is enabled. No dependencies,
build step, account, analytics, remote code, or network requests.

Originally built for Google Docs, Sheets, Drive, and Gmail, Nightfall also works
on other websites, including Jira and GitHub. Its simple CSS filter works broadly,
though results can vary by site.

Your choices persist across links, reloads, new tabs, and browser restarts.
A **!** badge means Chrome could not apply the change; hover for details.

## Settings

Right-click the toolbar **moon icon** and choose **Options**, or open `chrome://extensions`,
find Nightfall, and choose **Details → Extension options**. There is no popup:
clicking the **moon icon** directly toggles dark mode.

- **Per site** (default): the button remembers on/off for the current hostname.
  All tabs on that hostname update together. Subdomains have separate choices,
  so Docs and Gmail can have different settings. New sites start off.
- **Global**: the button toggles all supported websites together. Switching back
  to Per site restores your previous site choices.
- **Background brightness** and **Text brightness**: adjust independently, with
  a preview. Changes apply to open tabs and save automatically in this browser.
  Reset brightness restores the original soft charcoal look.

Switching modes keeps the last on/off choice for each mode. Global starts off;
enable it with the toolbar button or the checkbox on the Settings page.

## Privacy and permissions

- Website access (`http://*/*`, `https://*/*`): applies saved settings automatically
  when you visit sites. Chrome describes this as permission to read and change
  website data; Nightfall does not collect page text, emails, or document content.
- `scripting`: attaches bundled styles and the small settings script to tabs
  already open when the extension is installed or toggled.
- `storage`: saves the mode, brightness, global toggle, and hostname preferences
  locally on disk. Nothing is synced or transmitted.

The content script uses the page hostname and sets a styling attribute and CSS
variable on the root element. It does not inspect page text or form contents.
The running code is in `background.js`, `settings.js`, `content.js`, `dark.css`,
and the `options.*` files. `manifest.json`
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
- Already-dark websites will be inverted too; use Per site mode to leave them off.
- Filters can affect fixed-position elements and smoothness on large documents.
- Chrome's internal pages, Chrome Web Store, and some built-in viewers cannot
  be styled. Local file URLs are not supported.
- Google apps change frequently. This version has not been visually verified in
  signed-in Google apps; use the checklist below to confirm it in your account.

## Check it

Run `node --test tests/*.test.cjs` for the automated tests.

In Chrome, check Docs typing and scrolling, Sheets cell selection and formula
editing, Drive menus/previews, and Gmail composing/reading. Check same-site links,
reloads, browser restarts, and new tabs. Verify switching modes preserves site
choices, sliders update open tabs, disabling restores the page, and printing
uses the original colors. A brief light flash can occur while saved settings load.

## Manual installation

To install directly from the source files without the Chrome Web Store:

1. Download or clone this project and unzip it if needed.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the project folder containing `manifest.json`.
5. Open Chrome's extensions menu (the puzzle piece) and pin **Nightfall**.
6. Visit a website and click the button to turn dark mode on. Click again to
   restore the page. Right-click the button and choose **Options** for settings.

When updating from version 1.0, reload Nightfall in `chrome://extensions`, accept
the new website access permission if prompted, and refresh existing tabs once
to clear the old filter. After that, navigation and reloads keep your settings.
