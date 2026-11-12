# local-scrap-platform
Local Scrap Website – Version 1.0
# Local Scrap Platform — MVP frontend

A responsive customer-facing scrap pickup website and browser-based demo admin dashboard for a proposed Khammam, Telangana launch.

## Run locally
1. Extract the ZIP.
2. Open `index.html` in a modern browser, or use VS Code Live Server.
3. Click **Book a pickup** and submit a test request.
4. Click **Admin** to review the request, update its status, and export CSV.

No build step or package installation is required for this frontend prototype.

## Included
- Responsive landing page
- Scrap material catalogue
- Clearly labelled sample/indicative rates
- Pickup request form with basic validation
- Local browser storage for demo bookings
- Demo admin dashboard and status updates
- CSV export

## Important limitations
This is a frontend prototype, not a production booking service.
- Bookings are stored only in the current browser using `localStorage`.
- The admin screen is not authenticated or secure.
- No real SMS/WhatsApp notifications, maps, payment processing, cloud database, photo upload, or Android app is connected.
- Photo input stores filenames only; files are not uploaded.
- Sample rates are illustrative placeholders, not verified Khammam market prices.
- Do not publish this as a live commercial service until backend authentication, database access controls, server-side validation, privacy notice, operational policies and tested pickup/payment workflows are implemented.

## Next engineering milestone
Connect Supabase (PostgreSQL, Auth and Storage), implement role-based access and server-side booking creation, then build the Android app with Expo using the same backend.
