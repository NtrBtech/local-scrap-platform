const materials = [
  {id:1, name:"Paper", icon:"📦", desc:"Newspapers, books and paper"},
  {id:2, name:"Cardboard", icon:"📦", desc:"Cartons and cardboard boxes"},
  {id:3, name:"Iron and Steel", icon:"🔩", desc:"Metal scraps and household items"},
  {id:4, name:"Plastic", icon:"🧴", desc:"Clean bottles and hard plastics"},
  {id:5, name:"Aluminium", icon:"🥫", desc:"Cans, utensils and sections"},
  {id:6, name:"Copper and Brass", icon:"🟠", desc:"Wires, pipes and fittings"},
  {id:7, name:"E-Waste", icon:"💻", desc:"Accepted electronics and cables"}
];

// Demo-only sample rates. Replace after confirming actual local buying prices.
const rates = [
  ["Paper & cardboard","₹8–₹14","kg"],["Iron & steel","₹22–₹30","kg"],
  ["Plastic","₹5–₹18","kg"],["Aluminium","₹90–₹150","kg"],
  ["Copper & brass","₹350–₹650","kg"],["E-waste","On inspection","item / kg"]
];
const $ = s => document.querySelector(s);
// Replace with the owner's WhatsApp number including country code, digits only.
// Example: 919876543210 (do not include +, spaces or hyphens).
const OWNER_WHATSAPP_NUMBER = "919652721062";
const getBookings = () => { try{return JSON.parse(localStorage.getItem("localScrapBookings")||"[]")}catch{return []} };
const saveBookings = b => localStorage.setItem("localScrapBookings",JSON.stringify(b));
$("#year").textContent = new Date().getFullYear();
$("#materialGrid").innerHTML = materials.map(m=>`<article class="material-card"><div class="material-icon">${m.icon}</div><div><h3>${m.name}</h3><p>${m.desc}</p></div></article>`).join("");
$("#rateRows").innerHTML = rates.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("");
// Generate material selection with individual estimated quantities
$("#scrapChoices").innerHTML = materials.map(m => `
  <div class="material-option">
    <label class="choice">
      <input
        type="checkbox"
        name="scrap"
        value="${m.name}"
        data-category-id="${m.id}"
      >
      ${m.name}
    </label>

    <label class="material-quantity hidden">
      Estimated quantity (kg)
      <input
        type="number"
        min="0.1"
        step="0.1"
        placeholder="Enter quantity in kg"
        data-quantity-for="${m.id}"
        disabled
      >
    </label>
  </div>
`).join("");

// Show quantity field when a material is selected
$("#scrapChoices").addEventListener("change", event => {

    const checkbox = event.target;

    if (!checkbox.matches('input[name="scrap"]')) return;

    const option = checkbox.closest(".material-option");
    const quantityField = option.querySelector(".material-quantity");
    const quantityInput = option.querySelector("input[type='number']");

    if (checkbox.checked) {

        quantityField.classList.remove("hidden");

        quantityInput.disabled = false;
        quantityInput.required = true;
        quantityInput.min = "0.1";
        quantityInput.step = "0.1";

        quantityInput.focus();

    } else {

        quantityField.classList.add("hidden");

        quantityInput.required = false;
        quantityInput.disabled = true;
        quantityInput.value = "";

    }

});
const modal=$("#bookingModal");
function openModal() {
  if (!currentUser) {
    openAuthModal();
    toast("Please login before booking a pickup.");
    return;
  }

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closeModal(){modal.classList.add("hidden");document.body.style.overflow=""}
["bookTop","bookHero","bookBottom"].forEach(id=>$("#"+id).addEventListener("click",openModal));
$("#closeModal").addEventListener("click",closeModal);
modal.addEventListener("click",e=>{if(e.target===modal)closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
const dateInput=$("#pickupDate"); const today=new Date(); dateInput.min=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.remove("hidden");setTimeout(()=>t.classList.add("hidden"),3200)}
// =======================================
// SUPABASE CUSTOMER PICKUP BOOKING
// =======================================

$("#bookingForm").addEventListener("submit", async event => {

    event.preventDefault();

    const form = event.currentTarget;
    const errorBox = $("#formError");
    const submitButton = form.querySelector('button[type="submit"]');

    errorBox.textContent = "";

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {

        // Verify authenticated customer
        const { data: userData, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError) throw userError;

        const user = userData.user;

        if (!user) {
            throw new Error("Please log in before booking.");
        }

        const formData = new FormData(form);

        const customerName = String(formData.get("name") || "").trim();
        const phone = String(formData.get("phone") || "").trim();
        const address = String(formData.get("address") || "").trim();
        const pickupDate = formData.get("date");
        const pickupTime = formData.get("slot");
        const notes = String(formData.get("notes") || "").trim();

        // Validate customer information
        if (customerName.length < 2) {
            throw new Error("Please enter your full name.");
        }

        if (!/^[6-9]\d{9}$/.test(phone)) {
            throw new Error("Enter a valid 10-digit Indian mobile number.");
        }

        if (!address) {
            throw new Error("Please enter your pickup address.");
        }

        // Collect selected materials and their individual quantities
        const selectedCheckboxes = [
            ...form.querySelectorAll('input[name="scrap"]:checked')
        ];

        if (selectedCheckboxes.length === 0) {
            throw new Error("Please select at least one scrap material.");
        }

        const items = selectedCheckboxes.map(checkbox => {

            const categoryId = Number(checkbox.dataset.categoryId);

            const quantityInput = form.querySelector(
                `[data-quantity-for="${categoryId}"]`
            );

            const quantity = Number(quantityInput?.value);

            if (
    quantityInput.value.trim() === "" ||
    !Number.isFinite(quantity) ||
    quantity < 0.1
) {
    throw new Error(
        `Enter a quantity of at least 0.1 kg for ${checkbox.value}.`
    );
}

            return {
                category_id: categoryId,
                estimated_quantity_kg: quantity
            };
        });

        // Submit booking and all items through one database function
        const { data: bookingId, error } = await supabaseClient.rpc(
            "create_pickup_booking",
            {
                p_customer_name: customerName,
                p_customer_phone: phone,
                p_address: address,
                p_pickup_date: pickupDate,
                p_pickup_time: pickupTime,
                p_customer_notes: notes,
                p_items: items
            }
        );

        if (error) throw error;

        // Successful submission
        form.reset();

        form.querySelectorAll(".material-option").forEach(option => {
            const quantityField = option.querySelector(".material-quantity");
            const quantityInput = option.querySelector("input[type='number']");

            quantityField.classList.add("hidden");
            quantityInput.disabled = true;
            quantityInput.required = false;
        });

        $("#estimatedTotal").textContent =
            "Total estimated quantity: 0 kg";

        closeModal();

        toast(
            "Pickup request submitted successfully! Reference: " +
            bookingId.slice(0, 8)
        );

        console.log("Supabase booking created:", bookingId);

    } catch (error) {

        console.error("Booking submission failed:", error);

        errorBox.textContent = error.message ||
            "Unable to submit booking. Please try again.";

    } finally {

        submitButton.disabled = false;
        submitButton.textContent = "Submit pickup request →";

    }
});
// Calculate total estimated quantity
$("#scrapChoices").addEventListener("input", () => {

    let total = 0;

    document
        .querySelectorAll('#scrapChoices input[type="number"]:not(:disabled)')
        .forEach(input => {
            total += Number(input.value) || 0;
        });

    $("#estimatedTotal").textContent =
        "Total estimated quantity: " +
        total.toFixed(2) + " kg";
});
 
  

// Admin is intentionally omitted from public navigation. For this demo only,
// the owner can open index.html?admin=1. This is NOT authentication or security.
function showAdminView(){ $("#customerView").classList.add("hidden");$("#adminView").classList.remove("hidden");window.scrollTo(0,0);renderAdmin() }
if (new URLSearchParams(window.location.search).get("admin") === "1") showAdminView();
const backToSiteButton = $("#backToSite");

if (backToSiteButton) {
  backToSiteButton.addEventListener("click", () => {
    window.location.href = window.location.pathname;
  });
}
// Floating WhatsApp contact button
const whatsappButton = $("#whatsappButton");

if (whatsappButton) {
    whatsappButton.addEventListener("click", function(event) {
        event.preventDefault();

        const number = OWNER_WHATSAPP_NUMBER.replace(/\D/g, "");

        if (!/^91[6-9]\d{9}$/.test(number)) {
            alert("Please configure a valid Indian WhatsApp number.");
            return;
        }

        const message = "Hello Local Scrap! I would like to enquire about scrap collection and current rates in Khammam.";

        const url = "https://wa.me/" + number + "?text=" + encodeURIComponent(message);

        window.location.href = url;
    });
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
// =======================================
// ADMIN DASHBOARD - SUPABASE INTEGRATION
// =======================================

let adminBookingsCache = [];

let itemsByBooking = {};
let paymentsByBooking = {};

// =======================================
// LOCAL SCRAP - RECEIPT GENERATOR
// =======================================


function openLocalScrapReceipt(bookingId) {

    const booking = adminBookingsCache.find(
        item => item.id === bookingId
    );

    if (!booking) {
        toast("Booking details not found.");
        return;
    }

    const bookingPaymentRecords =
        paymentsByBooking[bookingId] || [];

    // Get all completed payments for this booking
    const completedPayments = bookingPaymentRecords
        .filter(payment => payment.payment_status === "completed")
        .sort((a, b) => {
            return new Date(a.paid_at || a.created_at).getTime()
                - new Date(b.paid_at || b.created_at).getTime();
        });

    if (completedPayments.length === 0) {
        toast("No completed payments found.");
        return;
    }

    const items = itemsByBooking[bookingId] || [];

    const categoryMap = new Map(
        materials.map(material => [
            Number(material.id),
            material.name
        ])
    );

    // Calculate total paid across all payment methods
    const totalPaid = completedPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
    );

    const finalAmount = Number(booking.actual_total || 0);

    const remainingBalance = Math.max(
        0,
        finalAmount - totalPaid
    );

    const latestPayment =
        completedPayments[completedPayments.length - 1];

    const paymentDate = new Date(
        latestPayment.paid_at || latestPayment.created_at
    );

    const formattedDate = paymentDate.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    });

    // Generate all payment rows for one consolidated receipt
    const paymentRowsHtml = completedPayments.map(payment => {

        const date = new Date(
            payment.paid_at || payment.created_at
        ).toLocaleString("en-IN");

        return `
            <tr>
                <td>${escapeHtml(payment.payment_method.toUpperCase())}</td>
                <td>₹${Number(payment.amount).toFixed(2)}</td>
                <td>${escapeHtml(date)}</td>
                <td>${escapeHtml(payment.transaction_reference || "—")}</td>
            </tr>
        `;
    }).join("");

    // Material-wise details
    const materialRows = items.map(item => {

        const materialName =
            categoryMap.get(Number(item.category_id)) || "Unknown material";

        const weight = Number(item.actual_quantity_kg || 0);
        const rate = Number(item.confirmed_price_per_kg || 0);
        const amount = weight * rate;

        return `
            <tr>
                <td>${escapeHtml(materialName)}</td>
                <td>${weight.toFixed(2)} kg</td>
                <td>₹${rate.toFixed(2)}</td>
                <td>₹${amount.toFixed(2)}</td>
            </tr>
        `;
    }).join("");

    // One receipt number per booking
    const receiptNumber =
        "LS-" +
        booking.id.replace(/-/g, "").slice(0, 8).toUpperCase();

    // WhatsApp message containing all payments
    const paymentMessage = completedPayments.map(payment =>
        payment.payment_method.toUpperCase() +
        ": Rs. " + Number(payment.amount).toFixed(2) +
        (payment.transaction_reference
            ? " | Reference: " + payment.transaction_reference
            : "")
    );

    let customerPhone = String(
        booking.customer_phone || ""
    ).replace(/\D/g, "");

    if (customerPhone.length === 10) {
        customerPhone = "91" + customerPhone;
    }

    const whatsappMessage = [
        "Hello " + booking.customer_name + ",",
        "",
        "Your Local Scrap consolidated payment receipt.",
        "Receipt No: " + receiptNumber,
        "Booking ID: " + booking.id.slice(0, 8).toUpperCase(),
        "Receipt date: " + formattedDate,
        "",
        "Final scrap value: Rs. " + finalAmount.toFixed(2),
        ...paymentMessage,
        "",
        "Total paid: Rs. " + totalPaid.toFixed(2),
        "Remaining balance: Rs. " + remainingBalance.toFixed(2),
        "",
        "Thank you for choosing Local Scrap, Khammam."
    ].join("\n");

    const whatsappUrl =
        "https://wa.me/" +
        customerPhone +
        "?text=" +
        encodeURIComponent(whatsappMessage);

    const receiptWindow = window.open("", "_blank");

    if (!receiptWindow) {
        toast("Allow pop-ups in your browser to open receipts.");
        return;
    }

    receiptWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Local Scrap Receipt - ${receiptNumber}</title>

            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: #f3f5f3;
                    margin: 0;
                    padding: 25px;
                    color: #222;
                }

                .receipt {
                    max-width: 750px;
                    margin: 20px auto;
                    background: white;
                    padding: 35px;
                    border: 1px solid #ddd;
                }

                .receipt-header {
                    text-align: center;
                    border-bottom: 2px solid #126b45;
                    padding-bottom: 18px;
                }

                .receipt-header h1 {
                    color: #126b45;
                    margin: 0 0 8px;
                }

                .receipt-number {
                    margin-top: 20px;
                    display: flex;
                    justify-content: space-between;
                    gap: 15px;
                    flex-wrap: wrap;
                }

                .section {
                    margin-top: 25px;
                }

                .section h3 {
                    color: #126b45;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 8px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 12px;
                }

                th, td {
                    border: 1px solid #ddd;
                    padding: 10px;
                    text-align: left;
                }

                th {
                    background: #edf5ef;
                }

                .amount-summary {
                    margin-top: 20px;
                    margin-left: auto;
                    max-width: 350px;
                }

                .amount-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    gap: 15px;
                }

                .grand-total {
                    border-top: 2px solid #126b45;
                    font-size: 18px;
                    font-weight: bold;
                    margin-top: 8px;
                    padding-top: 12px;
                }

                .payment-status {
                    color: #126b45;
                    font-weight: bold;
                }

                .receipt-footer {
                    text-align: center;
                    border-top: 1px solid #ddd;
                    margin-top: 35px;
                    padding-top: 20px;
                }

                .receipt-actions {
                    text-align: center;
                    margin: 25px auto;
                }

                .receipt-actions button {
                    border: 0;
                    border-radius: 6px;
                    padding: 12px 18px;
                    margin: 5px;
                    color: white;
                    background: #126b45;
                    cursor: pointer;
                    font-size: 14px;
                }

                .receipt-actions .whatsapp {
                    background: #168b52;
                }

                @media print {
                    body {
                        background: white;
                        padding: 0;
                    }

                    .receipt {
                        margin: 0 auto;
                        border: 0;
                        padding: 15px;
                    }

                    .receipt-actions {
                        display: none;
                    }
                }
            </style>
        </head>

        <body>
            <div class="receipt">

                <div class="receipt-header">
                    <h1>LOCAL SCRAP</h1>
                    <p>Doorstep Scrap Collection</p>
                    <p>Khammam, Telangana</p>
                    <h2>PAYMENT RECEIPT</h2>
                </div>

                <div class="receipt-number">
                    <div>
                        <strong>Receipt No:</strong>
                        ${receiptNumber}
                    </div>

                    <div>
                        <strong>Date:</strong>
                        ${escapeHtml(formattedDate)}
                    </div>
                </div>

                <div class="section">
                    <h3>Customer Details</h3>
                    <p><strong>Name:</strong> ${escapeHtml(booking.customer_name)}</p>
                    <p><strong>Mobile:</strong> ${escapeHtml(booking.customer_phone)}</p>
                    <p><strong>Address:</strong> ${escapeHtml(booking.address)}</p>
                    <p><strong>Booking ID:</strong> ${escapeHtml(booking.id)}</p>
                </div>

                <div class="section">
                    <h3>Scrap Details</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Material</th>
                                <th>Actual Weight</th>
                                <th>Rate / kg</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${materialRows}
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <h3>Payment Breakdown</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Method</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Reference</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${paymentRowsHtml}
                        </tbody>
                    </table>
                </div>

                <div class="amount-summary">
                    <div class="amount-row">
                        <span>Final scrap value</span>
                        <strong>₹${finalAmount.toFixed(2)}</strong>
                    </div>

                    <div class="amount-row">
                        <span>Total paid</span>
                        <strong>₹${totalPaid.toFixed(2)}</strong>
                    </div>

                    <div class="amount-row">
                        <span>Remaining balance</span>
                        <strong>₹${remainingBalance.toFixed(2)}</strong>
                    </div>

                    <div class="amount-row">
                        <span>Payment status</span>
                        <span class="payment-status">
                            ${remainingBalance === 0 ? "FULLY PAID" : "PARTIALLY PAID"}
                        </span>
                    </div>
                </div>

                <div class="receipt-footer">
                    <h3>Thank you for choosing Local Scrap!</h3>
                    <p>We appreciate your contribution to responsible recycling.</p>
                    <p><small>This receipt includes all completed payments for this booking.</small></p>
                </div>

            </div>

            <div class="receipt-actions">
                <button onclick="window.print()">Print / Save as PDF</button>

                <button class="whatsapp"
                    onclick="window.open('${whatsappUrl}', '_blank')">
                    Share on WhatsApp
                </button>
            </div>
        </body>
        </html>
    `);

    receiptWindow.document.close();
}


const bookingStatuses = [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "assigned", label: "Assigned" },
    { value: "on_the_way", label: "On the way" },
    { value: "collected", label: "Collected" },
    { value: "payment_completed", label: "Payment completed" },
    { value: "closed", label: "Closed" },
    { value: "rescheduled", label: "Rescheduled" },
    { value: "cancelled", label: "Cancelled" },
    { value: "rejected", label: "Rejected" }
];


async function renderAdmin() {

    const rows = $("#bookingRows");
    const empty = $("#emptyBookings");

    rows.innerHTML = `
        <tr><td colspan="9">Loading bookings...</td></tr>
    `;

    try {

        // Verify authenticated user
        const { data: userData, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError) throw userError;

        const user = userData.user;

        if (!user) {
            throw new Error("Please log in with your owner account.");
        }

        // Verify admin role
        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

        if (profileError) throw profileError;

        if (profile.role !== "admin") {
            throw new Error("Access denied. Admin role required.");
        }

        // Fetch bookings
        const { data: bookings, error: bookingError } =
            await supabaseClient
                .from("pickup_bookings")
                .select("*")
                .order("created_at", { ascending: false });

        if (bookingError) throw bookingError;

        adminBookingsCache = bookings || [];

        const bookingIds = adminBookingsCache.map(b => b.id);

        // Fetch booking items including actual weights and rates
        let bookingItems = [];

        if (bookingIds.length > 0) {

           
const { data: items, error: itemsError } =
    await supabaseClient
        .from("booking_items")
        .select(`
            id,
            booking_id,
            category_id,
            estimated_quantity_kg,
            actual_quantity_kg,
            confirmed_price_per_kg
        `)
        .in("booking_id", bookingIds);


            if (itemsError) throw itemsError;

            bookingItems = items || [];
        }

// Fetch payment records
let bookingPayments = [];

if (bookingIds.length > 0) {

    const { data: payments, error: paymentsError } =
        await supabaseClient
            .from("payments")
            .select(`
                id,
                booking_id,
                amount,
                payment_method,
                payment_status,
                transaction_reference,
                paid_at,
                created_at
            `)
            .in("booking_id", bookingIds)
            .order("created_at", { ascending: false });

    if (paymentsError) throw paymentsError;

    bookingPayments = payments || [];
}

// Group payments by booking
paymentsByBooking = {};

bookingPayments.forEach(payment => {

    if (!paymentsByBooking[payment.booking_id]) {
        paymentsByBooking[payment.booking_id] = [];
    }

    paymentsByBooking[payment.booking_id].push(payment);

});


        // Material mapping
        const categoryMap = new Map(
            materials.map(m => [Number(m.id), m.name])
        );

        itemsByBooking = {};

        bookingItems.forEach(item => {

            if (!itemsByBooking[item.booking_id]) {
                itemsByBooking[item.booking_id] = [];
            }

            itemsByBooking[item.booking_id].push(item);

        });

        // Dashboard metrics
        const total = adminBookingsCache.length;

        const pending = adminBookingsCache.filter(
            b => ["pending", "confirmed", "assigned", "on_the_way"]
                .includes(b.status)
        ).length;

        const collected = adminBookingsCache.filter(
            b => ["collected", "payment_completed", "closed"]
                .includes(b.status)
        ).length;

        
const paid = bookingPayments
    .filter(payment => payment.payment_status === "completed")
    .reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
    );
  

        $("#metricBookings").textContent = total;
        $("#metricPending").textContent = pending;
        $("#metricCollected").textContent = collected;

        $("#metricPaid").textContent =
            "₹" + paid.toLocaleString("en-IN");

        empty.classList.toggle("hidden", total > 0);

        // Render booking rows
        rows.innerHTML = adminBookingsCache.map(booking => {

            const items = itemsByBooking[booking.id] || [];

// Payment calculations
const bookingPaymentRecords =
    paymentsByBooking[booking.id] || [];

const completedPayments =
    bookingPaymentRecords.filter(
        payment => payment.payment_status === "completed"
    );

const totalPaid = completedPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
);

const finalAmount = Number(booking.actual_total || 0);

const remainingBalance = Math.max(
    0,
    finalAmount - totalPaid
);


            const materialDetails = items.map(item => {

                const name =
                    categoryMap.get(Number(item.category_id)) ||
                    "Unknown material";

                const estimated =
                    Number(item.estimated_quantity_kg || 0);

                const actual =
                    item.actual_quantity_kg == null
                        ? "Not weighed"
                        : Number(item.actual_quantity_kg).toFixed(2) + " kg";

                const rate =
                    item.confirmed_price_per_kg == null
                        ? "Not set"
                        : "₹" +
                          Number(item.confirmed_price_per_kg).toFixed(2) +
                          "/kg";

                return `
                    ${escapeHtml(name)}:
                    Estimated ${estimated.toFixed(2)} kg |
                    Actual ${actual} |
                    Rate ${rate}
                `;

            }).join("<br>");

            const pickupDate = booking.pickup_date
                ? new Date(
                    booking.pickup_date + "T00:00:00"
                ).toLocaleDateString("en-IN")
                : "Not specified";

            const statusLabel = bookingStatuses.find(
                s => s.value === booking.status
            )?.label || booking.status;

            const statusClass = [
                "collected",
                "payment_completed",
                "closed"
            ].includes(booking.status) ? "done" : "";

            return `
                <tr>

                    <td>
                        <b>${escapeHtml(booking.id.slice(0, 8))}</b>
                        <br>
                        <small>
                            ${new Date(booking.created_at)
                                .toLocaleDateString("en-IN")}
                        </small>
                    </td>

                    <td>
                        ${escapeHtml(booking.customer_name)}
                        <br>
                        <small>${escapeHtml(booking.customer_phone)}</small>
                        <br>
                        <small>${escapeHtml(booking.address)}</small>
                    </td>

                    <td>
                        ${materialDetails || "No items"}
                    </td>

                    <td>
                        ${escapeHtml(pickupDate)}
                        <br>
                        <small>
                            ${escapeHtml(booking.pickup_time || "")}
                        </small>
                    </td>

                    <td>
                        ${Number(booking.estimated_total || 0).toFixed(2)} kg
                    </td>

                    <!-- WEIGHING SECTION -->
                    <td>

                        <details class="weighing-details">

                            <summary>Record weighing</summary>

                            <div class="weighing-editor">

                                ${items.map(item => {

                                    const materialName =
                                        categoryMap.get(Number(item.category_id))
                                        || "Material";

                                    const actualValue =
                                        item.actual_quantity_kg ?? "";

                                    const rateValue =
                                        item.confirmed_price_per_kg ?? "";

                                    return `
                                        <div
                                            class="weighing-item"
                                            data-item-id="${escapeHtml(item.id)}"
                                        >

                                            <strong>
                                                ${escapeHtml(materialName)}
                                            </strong>

                                            <label>
                                                Actual weight (kg)

                                                <input
                                                    class="actual-weight"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value="${escapeHtml(actualValue)}"
                                                    placeholder="Example: 4.50"
                                                >
                                            </label>

                                            <label>
                                                Confirmed rate (₹/kg)

                                                <input
                                                    class="confirmed-rate"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value="${escapeHtml(rateValue)}"
                                                    placeholder="Example: 12.00"
                                                >
                                            </label>

                                        </div>
                                    `;

                                }).join("")}

                                <button
                                    type="button"
                                    class="save-weighing-btn"
                                    data-booking-id="${escapeHtml(booking.id)}"
                                >
                                    Save weighing
                                </button>

                                <p
                                    class="weighing-result"
                                    aria-live="polite"
                                ></p>

                            </div>

                        </details>

                    </td>


<!-- PAYMENT SECTION -->
<td>

    <details class="payment-details">

        <summary>Record payment</summary>

        <div class="payment-editor">

            <p>
                Final amount:
                <strong>
                    ₹${finalAmount.toFixed(2)}
                </strong>
            </p>

            <p>
                Already paid:
                <strong>
                    ₹${totalPaid.toFixed(2)}
                </strong>
            </p>

            <p>
                Remaining:
                <strong>
                    ₹${remainingBalance.toFixed(2)}
                </strong>
            </p>

            
${bookingPaymentRecords.map(payment => `
    <div class="payment-history">
        <strong>₹${Number(payment.amount).toFixed(2)}</strong>
        — ${escapeHtml(payment.payment_method.toUpperCase())}
        — ${escapeHtml(payment.payment_status)}

        ${payment.transaction_reference
            ? `<br>Reference: ${escapeHtml(payment.transaction_reference)}`
            : ""}
    </div>
`).join("")}

${completedPayments.length > 0 ? `
    <div class="receipt-actions">
        <button
            type="button"
            class="view-receipt-btn"
            data-booking-id="${escapeHtml(booking.id)}"
        >
            View / Print Consolidated Receipt
        </button>
    </div>
` : ""}
  

            ${
                remainingBalance > 0
                && finalAmount > 0
                && booking.status !== "cancelled"
                && booking.status !== "rejected"
                ? `
                    <label>
                        Payment amount (₹)

                        <input
                            type="number"
                            class="payment-amount"
                            min="0.01"
                            max="${remainingBalance.toFixed(2)}"
                            step="0.01"
                            placeholder="Enter amount"
                        >
                    </label>

                    <label>
                        Payment method

                        <select class="payment-method">
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                        </select>
                    </label>

                    <label>
                        UPI transaction reference

                        <input
                            type="text"
                            class="payment-reference"
                            placeholder="Enter UPI reference"
                        >
                    </label>

                    <button
                        type="button"
                        class="record-payment-btn"
                        data-booking-id="${escapeHtml(booking.id)}"
                    >
                        Save payment
                    </button>

                    <p class="payment-result"></p>
                `
                : remainingBalance <= 0
                    ? "<strong>Fully paid</strong>"
                    : "<small>Complete weighing before recording payment.</small>"
            }

        </div>

    </details>

</td>


                    <!-- STATUS -->
                    <td>

                        <span class="status-pill ${statusClass}">
                            ${escapeHtml(statusLabel)}
                        </span>

                    </td>

                    <!-- UPDATE STATUS -->
                    <td>

                        <select
                            class="status-select"
                            data-id="${escapeHtml(booking.id)}"
                        >

                            ${bookingStatuses.map(status => `
                                <option
                                    value="${status.value}"
                                    ${booking.status === status.value
                                        ? "selected" : ""}
                                >
                                    ${status.label}
                                </option>
                            `).join("")}

                        </select>

                    </td>

                </tr>
            `;

        }).join("");

        // Save weighing button
        // View / Print receipt buttons
rows.querySelectorAll(".view-receipt-btn")
    .forEach(button => {

        button.addEventListener("click", () => {

            openLocalScrapReceipt(button.dataset.bookingId);

        });

    });
        rows.querySelectorAll(".save-weighing-btn")
            .forEach(button => {

                button.addEventListener("click", async () => {

                    const editor =
                        button.closest(".weighing-editor");

                    const result =
                        editor.querySelector(".weighing-result");

                    const bookingId =
                        button.dataset.bookingId;

                    const itemRows = [
                        ...editor.querySelectorAll(".weighing-item")
                    ];

                    try {

                        const weighingItems = itemRows.map(row => {

                            const weightInput =
                                row.querySelector(".actual-weight");

                            const rateInput =
                                row.querySelector(".confirmed-rate");

                            const weightText =
                                weightInput.value.trim();

                            const rateText =
                                rateInput.value.trim();

                            const weight = Number(weightText);
                            const rate = Number(rateText);

                            if (
                                weightText === "" ||
                                rateText === "" ||
                                !Number.isFinite(weight) ||
                                !Number.isFinite(rate) ||
                                weight < 0 ||
                                rate < 0
                            ) {
                                throw new Error(
                                    "Enter valid actual weight and rate for every material."
                                );
                            }

                            return {
                                item_id: Number(row.dataset.itemId),
                                actual_quantity_kg: weight,
                                confirmed_price_per_kg: rate
                            };

                        });

                        button.disabled = true;
                        button.textContent = "Saving...";
                        result.textContent = "";

                        // Call Supabase weighing function
                        const { data: finalAmount, error } =
                            await supabaseClient.rpc(
                                "save_booking_weighing",
                                {
                                    p_booking_id: bookingId,
                                    p_items: weighingItems
                                }
                            );

                        if (error) throw error;

                        result.textContent =
                            "Saved. Final amount: ₹" +
                            Number(finalAmount || 0).toFixed(2);

                        toast("Weighing saved successfully.");

                        await renderAdmin();

                    } catch (error) {

                        console.error(
                            "Weighing save failed:",
                            error
                        );

                        result.textContent = error.message;

                        toast(
                            "Unable to save weighing: " +
                            error.message
                        );

                    } finally {

                        button.disabled = false;
                        button.textContent = "Save weighing";

                    }

                });

            });

        // Booking status update

// Record Cash / UPI payments
rows.querySelectorAll(".record-payment-btn")
    .forEach(button => {

        button.addEventListener("click", async () => {

            const editor = button.closest(".payment-editor");

            const result = editor.querySelector(".payment-result");

            const amountInput =
                editor.querySelector(".payment-amount");

            const methodInput =
                editor.querySelector(".payment-method");

            const referenceInput =
                editor.querySelector(".payment-reference");

            const amountText = amountInput.value.trim();
            const amount = Number(amountText);

            const method = methodInput.value;

            const reference = referenceInput.value.trim();

            if (
                amountText === "" ||
                !Number.isFinite(amount) ||
                amount <= 0
            ) {
                result.textContent =
                    "Enter a valid payment amount.";

                return;
            }

            if (method === "upi" && !reference) {
                result.textContent =
                    "Enter the UPI transaction reference.";

                return;
            }

            button.disabled = true;
            button.textContent = "Saving payment...";

            try {

                const { data: remaining, error } =
                    await supabaseClient.rpc(
                        "record_booking_payment",
                        {
                            p_booking_id: button.dataset.bookingId,
                            p_amount: amount,
                            p_payment_method: method,
                            p_transaction_reference:
                                method === "upi" ? reference : null
                        }
                    );

                if (error) throw error;

                toast(
                    "Payment recorded successfully. Remaining: ₹" +
                    Number(remaining).toFixed(2)
                );

                await renderAdmin();

            } catch (error) {

                console.error("Payment recording failed:", error);

                result.textContent = error.message;

                toast("Payment failed: " + error.message);

            } finally {

                button.disabled = false;
                button.textContent = "Save payment";

            }

        });

    });

        rows.querySelectorAll(".status-select")
            .forEach(select => {

                select.addEventListener("change", async () => {

                    const bookingId = select.dataset.id;
                    const newStatus = select.value;

                    select.disabled = true;

                    try {

                        const { error } = await supabaseClient
                            .from("pickup_bookings")
                            .update({ status: newStatus })
                            .eq("id", bookingId);

                        if (error) throw error;

                        toast("Booking status updated successfully.");

                        await renderAdmin();

                    } catch (error) {

                        console.error(
                            "Status update failed:",
                            error
                        );

                        toast(
                            "Status update failed: " + error.message
                        );

                        await renderAdmin();

                    }

                });

            });

        console.log(
            "Admin dashboard loaded:",
            adminBookingsCache.length,
            "bookings"
        );

    } catch (error) {

        console.error("Admin dashboard error:", error);

        rows.innerHTML = "";

        empty.classList.remove("hidden");
        empty.textContent = error.message;

    }

}



if (whatsappButton) {
    whatsappButton.href =
        `https://wa.me/${OWNER_WHATSAPP_NUMBER}`;
}

// ===================================
// LOCAL SCRAP - SUPABASE CONNECTION
// ===================================

async function testSupabaseConnection() {
    try {
        const { data, error } = await supabaseClient
            .from("scrap_categories")
            .select("id, name")
            .eq("is_active", true);

        if (error) {
            console.error("Supabase connection error:", error.message);
            return;
        }

        console.log("Supabase connected successfully!");
        console.log("Available scrap categories:", data);

    } catch (err) {
        console.error("Connection failed:", err);
    }
}

testSupabaseConnection();

// =======================================
// LOCAL SCRAP - CUSTOMER AUTHENTICATION
// =======================================

let currentUser = null;
let authMode = "login";

const authModal = $("#authModal");
const authForm = $("#authForm");
const authError = $("#authError");
const authTitle = $("#authTitle");
const authDescription = $("#authDescription");
const authSubmit = $("#authSubmit");
const nameField = $("#nameField");
const confirmPasswordField = $("#confirmPasswordField");

// Open authentication modal
function openAuthModal() {
    authModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    setAuthMode("login");
}

// Close authentication modal
function closeAuthModal() {
    authModal.classList.add("hidden");
    document.body.style.overflow = "";
    authForm.reset();
    authError.textContent = "";
}

// Switch between login and registration
function setAuthMode(mode) {
    authMode = mode;
    authError.textContent = "";

    const isSignup = mode === "signup";

    authTitle.textContent = isSignup
        ? "Create Customer Account"
        : "Customer Login";

    authDescription.textContent = isSignup
        ? "Register to book your scrap pickup."
        : "Login to book your doorstep scrap pickup.";

    nameField.classList.toggle("hidden", !isSignup);
    confirmPasswordField.classList.toggle("hidden", !isSignup);

    $("#authName").required = isSignup;
    $("#authConfirmPassword").required = isSignup;

    authSubmit.textContent = isSignup
        ? "Create Account"
        : "Login";

    $("#authSwitchText").textContent = isSignup
        ? "Already have an account?"
        : "New customer?";

    $("#authSwitch").textContent = isSignup
        ? "Login here"
        : "Create an account";
}

// Switch button
$("#authSwitch").addEventListener("click", () => {
    setAuthMode(authMode === "login" ? "signup" : "login");
});

// Open and close modal
$("#accountButton").addEventListener("click", () => {
    if (currentUser) {
        toast("You are logged in as " + currentUser.email);
    } else {
        openAuthModal();
    }
});

$("#logoutButton").addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        toast("Logout failed: " + error.message);
        return;
    }

    toast("Logged out successfully.");
});

$("#closeAuthModal").addEventListener("click", closeAuthModal);

authModal.addEventListener("click", event => {
    if (event.target === authModal) {
        closeAuthModal();
    }
});

// Update login status in website
function updateAuthUI() {
    $("#accountButton").textContent = currentUser
        ? "My Account"
        : "Login / Register";

    $("#logoutButton").classList.toggle(
        "hidden",
        !currentUser
    );
}

// Registration and login
authForm.addEventListener("submit", async event => {
    event.preventDefault();

    authError.textContent = "";
    authSubmit.disabled = true;
    authSubmit.textContent = "Please wait...";

    const email = $("#authEmail").value.trim();
    const password = $("#authPassword").value;

    try {

        if (authMode === "signup") {

            const fullName = $("#authName").value.trim();
            const confirmPassword =
                $("#authConfirmPassword").value;

            if (password !== confirmPassword) {
                throw new Error("Passwords do not match.");
            }

            if (fullName.length < 2) {
                throw new Error("Please enter your full name.");
            }

            const { data, error } =
                await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: fullName
                        }
                    }
                });

            if (error) throw error;

            if (data.session) {
                closeAuthModal();
                toast("Account created successfully. Welcome to Local Scrap!");
            } else {
                authError.textContent =
                    "Account created. Please check your email to continue.";
            }

        } else {

            const { error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (error) throw error;

            closeAuthModal();
            toast("Login successful. You can now book a pickup.");

        }

    } catch (error) {

        authError.textContent = error.message;

    } finally {

        authSubmit.disabled = false;

        authSubmit.textContent =
            authMode === "signup"
                ? "Create Account"
                : "Login";
    }
});

// Restore login session when website refreshes
async function initializeCustomerAuth() {

    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {
        console.error("Session error:", error.message);
        return;
    }

    currentUser = data.session?.user ?? null;
    updateAuthUI();

    supabaseClient.auth.onAuthStateChange(
        (event, session) => {
            currentUser = session?.user ?? null;
            updateAuthUI();
        }
    );
}

initializeCustomerAuth();