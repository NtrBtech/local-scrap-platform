# Local Scrap Platform — Version 1.1

Responsive customer-facing scrap pickup website and browser-based demo admin dashboard for a proposed Khammam, Telangana launch.

## Run locally
1. Keep `index.html`, `styles.css`, `app.js` and this README in the same folder.
2. Open the folder in VS Code and run `index.html` with Live Server.
3. Test the customer booking form. Demo bookings are saved in this browser only.
4. The demo admin view is opened with `index.html?admin=1` (or `?admin=1` on the Live Server URL).

## V1.1 updates
- Removed the Admin button from public navigation.
- Added Home, About, Scrap Categories, Rates and Contact navigation.
- Added an About Local Scrap section.
- Added a floating WhatsApp contact button with hover animation.
- Improved the About section and floating button for mobile layouts.
- Admin demo remains accessible by a non-secret query string for local testing.

## Configure the WhatsApp number
Open `app.js` and find:

```js
const OWNER_WHATSAPP_NUMBER = "91XXXXXXXXXX";
```

Replace it with the owner's WhatsApp number including country code, digits only. Example format: `919876543210`. Do not include `+`, spaces or hyphens.

## Important limitations
This is still a frontend prototype, not a production booking service.
- Bookings are stored only in the current browser using `localStorage`.
- The admin query string is NOT authentication. Anyone who knows the URL can open the demo admin view. Do not publish this admin view publicly until Supabase Auth and database Row Level Security are implemented.
- No real SMS/WhatsApp notifications, maps, payment processing, cloud database, photo upload, or Android app is connected.
- Photo input stores filenames only; files are not uploaded.
- Sample rates are illustrative placeholders, not verified Khammam market prices.
- Do not publish as a live commercial service until backend authentication, access controls, server-side validation, privacy notice and tested pickup/payment workflows are implemented.
