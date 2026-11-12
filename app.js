// Owner's WhatsApp number
// Replace this later with the owner's number including country code.
// Example: 919876543210
const OWNER_WHATSAPP_NUMBER = "91XXXXXXXXXX";

// Open WhatsApp with a pre-filled message
function openWhatsApp(message) {
    const url = `https://wa.me/${919652721062}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
}
function orderViaWhatsApp() {
    const name = document.getElementById("customerName")?.value || "";
    const phone = document.getElementById("customerPhone")?.value || "";
    const address = document.getElementById("customerAddress")?.value || "";
    const quantity = document.getElementById("estimatedQuantity")?.value || "";

    const message = `
Hello Local Scrap!

I want to book a scrap pickup.

Customer Name: ${name}
Customer Phone: ${phone}
Pickup Address: ${address}
Estimated Quantity: ${quantity}

Please contact me to confirm the pickup.

Thank you.
    `;

    openWhatsApp(message);
}
function contactOwnerWhatsApp() {
    const message = `
Hello Local Scrap!

I would like to enquire about your scrap collection service.

Please share the scrap rates and pickup details.

Thank you.
    `;

    openWhatsApp(message);
}
const materials = [
  {name:"Paper & cardboard",icon:"📦",desc:"Newspapers, books, cartons"},
  {name:"Iron & steel",icon:"🔩",desc:"Metal scraps and household items"},
  {name:"Plastic",icon:"🧴",desc:"Clean bottles and hard plastics"},
  {name:"Aluminium",icon:"🥫",desc:"Cans, utensils and sections"},
  {name:"Copper & brass",icon:"🟠",desc:"Wires, pipes and fittings"},
  {name:"E-waste",icon:"💻",desc:"Accepted electronics and cables"}
];
// Demo-only sample rates. Replace after confirming actual local buying prices.
const rates = [
  ["Paper & cardboard","₹8–₹14","kg"],["Iron & steel","₹22–₹30","kg"],
  ["Plastic","₹5–₹18","kg"],["Aluminium","₹90–₹150","kg"],
  ["Copper & brass","₹350–₹650","kg"],["E-waste","On inspection","item / kg"]
];
const $ = s => document.querySelector(s);
const getBookings = () => { try{return JSON.parse(localStorage.getItem("localScrapBookings")||"[]")}catch{return []} };
const saveBookings = b => localStorage.setItem("localScrapBookings",JSON.stringify(b));
$("#year").textContent = new Date().getFullYear();
$("#materialGrid").innerHTML = materials.map(m=>`<article class="material-card"><div class="material-icon">${m.icon}</div><div><h3>${m.name}</h3><p>${m.desc}</p></div></article>`).join("");
$("#rateRows").innerHTML = rates.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("");
$("#scrapChoices").innerHTML = materials.map((m,i)=>`<label class="choice"><input type="checkbox" name="scrap" value="${m.name}"> ${m.name}</label>`).join("");
const modal=$("#bookingModal");
function openModal(){modal.classList.remove("hidden");document.body.style.overflow="hidden"}
function closeModal(){modal.classList.add("hidden");document.body.style.overflow=""}
["bookTop","bookHero","bookBottom"].forEach(id=>$("#"+id).addEventListener("click",openModal));
$("#closeModal").addEventListener("click",closeModal);
modal.addEventListener("click",e=>{if(e.target===modal)closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
const dateInput=$("#pickupDate"); const today=new Date(); dateInput.min=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.remove("hidden");setTimeout(()=>t.classList.add("hidden"),3200)}
$("#bookingForm").addEventListener("submit",e=>{
  e.preventDefault(); const form=e.currentTarget; const data=new FormData(form);
  const selected=[...form.querySelectorAll('input[name="scrap"]:checked')].map(x=>x.value);
  const err=$("#formError");err.textContent="";
  if(selected.length===0){err.textContent="Please select at least one scrap material.";return}
  const phone=String(data.get("phone")).trim();if(!/^[6-9]\d{9}$/.test(phone)){err.textContent="Enter a valid 10-digit Indian mobile number.";return}
  const booking={id:"LS"+Date.now().toString().slice(-8),name:data.get("name").trim(),phone,address:data.get("address").trim(),date:data.get("date"),slot:data.get("slot"),materials:selected,quantity:data.get("quantity"),notes:data.get("notes"),photoNames:[...($("#photoInput").files||[])].map(f=>f.name),status:"Pending",createdAt:new Date().toISOString(),paid:0};
  const bookings=getBookings();bookings.unshift(booking);saveBookings(bookings);form.reset();closeModal();toast("Pickup request submitted. Reference: "+booking.id);
});
$("#adminOpen").addEventListener("click",()=>{ $("#customerView").classList.add("hidden");$("#adminView").classList.remove("hidden");window.scrollTo(0,0);renderAdmin()});
$("#backToSite").addEventListener("click",()=>{ $("#adminView").classList.add("hidden");$("#customerView").classList.remove("hidden");window.scrollTo(0,0)});
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderAdmin(){
 const b=getBookings();$("#metricBookings").textContent=b.length;$("#metricPending").textContent=b.filter(x=>["Pending","Confirmed","Assigned","On the way"].includes(x.status)).length;$("#metricCollected").textContent=b.filter(x=>["Collected","Payment completed","Closed"].includes(x.status)).length;$("#metricPaid").textContent="₹"+b.reduce((s,x)=>s+(Number(x.paid)||0),0).toLocaleString("en-IN");
 $("#emptyBookings").classList.toggle("hidden",b.length>0);
 $("#bookingRows").innerHTML=b.map(x=>`<tr><td><b>${escapeHtml(x.id)}</b><br><small>${new Date(x.createdAt).toLocaleDateString("en-IN")}</small></td><td>${escapeHtml(x.name)}<br><small>${escapeHtml(x.phone)}</small></td><td>${x.materials.map(escapeHtml).join(", ")}</td><td>${escapeHtml(x.date)}<br><small>${escapeHtml(x.slot)}</small></td><td>${escapeHtml(x.quantity)}</td><td><span class="status-pill ${["Collected","Payment completed","Closed"].includes(x.status)?"done":""}">${escapeHtml(x.status)}</span></td><td><select class="status-select" data-id="${escapeHtml(x.id)}">${["Pending","Confirmed","Assigned","On the way","Collected","Payment completed","Closed","Cancelled","Rejected"].map(s=>`<option ${x.status===s?"selected":""}>${s}</option>`).join("")}</select></td></tr>`).join("");
 document.querySelectorAll(".status-select").forEach(sel=>sel.addEventListener("change",()=>{const all=getBookings();const item=all.find(x=>x.id===sel.dataset.id);if(item){item.status=sel.value;saveBookings(all);renderAdmin();toast("Booking status updated.")}}));
}
$("#exportCsv").addEventListener("click",()=>{const b=getBookings();if(!b.length){toast("No bookings to export.");return}const cols=["id","name","phone","address","date","slot","materials","quantity","status","createdAt"];const csv=[cols.join(","),...b.map(x=>cols.map(k=>'"'+String(k==="materials"?x[k].join("; "):x[k]??"").replace(/"/g,'""')+'"').join(","))].join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="local-scrap-bookings.csv";a.click();URL.revokeObjectURL(a.href)});
