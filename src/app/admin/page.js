// admin
"use client";
import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";

const STORES = [
  { id: "minamiurawa", name: "南浦和本院" },
  { id: "toda", name: "戸田院" },
];

const ADMIN_USERS = [
  { id: "minamiurawa", name: "南浦和本院", password: "yurari-minami" },
  { id: "toda", name: "戸田院", password: "yurari-toda" },
];

const PAYMENT_METHODS = [
  { id: "cash", name: "現金", icon: "💴" },
  { id: "card", name: "クレジットカード", icon: "💳" },
  { id: "ic", name: "交通系電子マネー", icon: "🚃" },
  { id: "id", name: "iD", icon: "📱" },
  { id: "quicpay", name: "QUICPay", icon: "📱" },
  { id: "paypay", name: "PayPay", icon: "📱" },
  { id: "aupay", name: "auペイ", icon: "📱" },
  { id: "dpay", name: "d払い", icon: "📱" },
  { id: "merpay", name: "メルペイ", icon: "📱" },
  { id: "rakutenpay", name: "楽天ペイ", icon: "📱" },
  { id: "transfer", name: "口座振替", icon: "🏦" },
  { id: "ticket", name: "ゆらり金券", icon: "🎫" },
];

const BASE_SLOTS = [
  "10:00","10:30","11:00","11:30","12:00","12:30","13:00",
  "13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30"
];
const MORNING_EXT = ["09:00","09:30"];
const EVENING_EXT = ["20:00","20:30"];
const BREAK_SLOTS = ["13:30","14:00","14:30"];
const BREAK_RELEASED_SLOTS = ["13:30","14:00","14:30"];
const DAYS_JP = ["日","月","火","水","木","金","土"];
const DAYS_FULL = ["日曜","月曜","火曜","水曜","木曜","金曜","土曜"];
const NOMINEE_STAFFS = ["工藤昌彦", "久保田誠", "工藤浩哉", "工藤都"];

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentStore, setCurrentStore] = useState(null);
  const [password, setPassword] = useState("");
  const [selectedStore, setSelectedStore] = useState("minamiurawa");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("calendar");
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [blocks, setBlocks] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [customerListSearch, setCustomerListSearch] = useState("");
  const [customerSortKey, setCustomerSortKey] = useState("customer_number");
  const [customerSortOrder, setCustomerSortOrder] = useState("asc");
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [mergeSource, setMergeSource] = useState(null);
  const [importData, setImportData] = useState([]);
  const [completedBookings, setCompletedBookings] = useState([]);
  const [selectedCompletedPayment, setSelectedCompletedPayment] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [dailyReport, setDailyReport] = useState(null);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [blockModal, setBlockModal] = useState(null);
  const [changeBookingModal, setChangeBookingModal] = useState(null);
  const [changeBookingForm, setChangeBookingForm] = useState({});
  const [blockReason, setBlockReason] = useState("");
  const [blockDuration, setBlockDuration] = useState(1); // スロット数
  const [shifts, setShifts] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState([]);
  const [shiftMonth, setShiftMonth] = useState(new Date());
  const [monthShifts, setMonthShifts] = useState([]);
  const [shiftPlans, setShiftPlans] = useState([]);
  const [popover, setPopover] = useState(null);
  const [shiftSubTab, setShiftSubTab] = useState("monthly");
  const [editingPlan, setEditingPlan] = useState(null);
  const [newPlanName, setNewPlanName] = useState("");
  const [applyPlanModal, setApplyPlanModal] = useState(null);
  const [applyWeekStart, setApplyWeekStart] = useState(new Date().toISOString().split("T")[0]);
  const [applyWeekEnd, setApplyWeekEnd] = useState(new Date().toISOString().split("T")[0]);
  const [products, setProducts] = useState([]);
  const [checkoutBooking, setCheckoutBooking] = useState(null);
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [checkoutDiscount, setCheckoutDiscount] = useState(0);
  const [checkoutDiscountReason, setCheckoutDiscountReason] = useState("");
  const [checkoutPaymentMethods, setCheckoutPaymentMethods] = useState([{ method: "cash", amount: 0 }]);
  const [checkoutNote, setCheckoutNote] = useState("");
  const [checkoutFreeProduct, setCheckoutFreeProduct] = useState({ name: "", price: "", quantity: 1 });
  const [checkoutTicketUse, setCheckoutTicketUse] = useState({ purchase: 0, present: 0 });
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [todayBookings, setTodayBookings] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [courseMenus, setCourseMenus] = useState([]);
  const [subMenus, setSubMenus] = useState([]);
  const [editingSubMenu, setEditingSubMenu] = useState(null);
  const [settingsSubTab, setSettingsSubTab] = useState("staff");
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [leadTime, setLeadTime] = useState(60);
  const [giftTicketTemplates, setGiftTicketTemplates] = useState([]);
  const [customerTickets, setCustomerTickets] = useState([]);
  const [allCustomerTickets, setAllCustomerTickets] = useState({});
  const [editTicketModal, setEditTicketModal] = useState(null); // { customer, type: "purchase"|"present", count, date }
  const [editingTicketTemplate, setEditingTicketTemplate] = useState(null);
  const [lineMessages, setLineMessages] = useState([]);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [unreadAdminCount, setUnreadAdminCount] = useState(0);
  const [showAdminNotif, setShowAdminNotif] = useState(false);
  const [lineReplyText, setLineReplyText] = useState("");
  const [selectedLineUser, setSelectedLineUser] = useState(null);
  const [unreadLineCount, setUnreadLineCount] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [checkoutSellTicketId, setCheckoutSellTicketId] = useState("");
  const [checkoutPresentTicketId, setCheckoutPresentTicketId] = useState("");
  const [directBookingModal, setDirectBookingModal] = useState(null);
  const [directBookingForm, setDirectBookingForm] = useState({});
  const [directBookingMode, setDirectBookingMode] = useState("normal");
  const [directBookingCategory, setDirectBookingCategory] = useState("");
  const [directBookingFirstOnly, setDirectBookingFirstOnly] = useState("");
  const [isSavingDirectBooking, setIsSavingDirectBooking] = useState(false);
  const [directBookingProducts, setDirectBookingProducts] = useState([{ name: "", price: "", quantity: 1 }]);
  const [customerSearchResult, setCustomerSearchResult] = useState(null);
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [giftModal, setGiftModal] = useState(null); // { customer, mode: 'sell' or 'present' }
  const [draggedBooking, setDraggedBooking] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);
  const [stagedBookings, setStagedBookings] = useState([]);
  const [dragOverStaging, setDragOverStaging] = useState(false);
  const [giftForm, setGiftForm] = useState({});
  const [giftCustomerSearch, setGiftCustomerSearch] = useState("");
  const [giftCustomerResult, setGiftCustomerResult] = useState(null);
  const [giftSelectedCustomer, setGiftSelectedCustomer] = useState(null);
  const [giftSaving, setGiftSaving] = useState(false);
  const [giftDone, setGiftDone] = useState(false);
  const [giftHistory, setGiftHistory] = useState([]);
  const [notifyTarget, setNotifyTarget] = useState("all"); // all / individual
  const [notifyCustomerId, setNotifyCustomerId] = useState("");
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");
  const [notifySending, setNotifySending] = useState(false);
  const [notifySent, setNotifySent] = useState(false);
  const [notifyCustomerSearch, setNotifyCustomerSearch] = useState("");
  const [notifyCustomerResult, setNotifyCustomerResult] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [connectedBooking, setConnectedBooking] = useState(null);
  const [includeConnectedBooking, setIncludeConnectedBooking] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
const [visitPayment, setVisitPayment] = useState(null);
const [visitPaymentItems, setVisitPaymentItems] = useState([]);
  const [courseTabCategory, setCourseTabCategory] = useState("整体");
  const [qrInput, setQrInput] = useState("");
const [checkinResult, setCheckinResult] = useState(null);
const [todayReceived, setTodayReceived] = useState([]);
const [monthBookingDates, setMonthBookingDates] = useState(new Set());
const [monthShiftOffDates, setMonthShiftOffDates] = useState(new Set());
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [monthlyReportMonth, setMonthlyReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthlyReportLoading, setMonthlyReportLoading] = useState(false);
  const [editingMonthlyTarget, setEditingMonthlyTarget] = useState(false);
  const [monthlyTargetInput, setMonthlyTargetInput] = useState("");
  useEffect(() => {
    const storeId = localStorage.getItem('yurari_admin_store');
    const expire = localStorage.getItem('yurari_admin_expire');
    if (storeId && expire && Date.now() < parseInt(expire)) {
      const user = ADMIN_USERS.find(u => u.id === storeId);
      if (user) { setLoggedIn(true); setCurrentStore(user); }
    }
  }, []);
  const popoverRef = useRef(null);

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

 const handleLogin = () => {
    const user = ADMIN_USERS.find(u => u.id === selectedStore && u.password === password);
    if (user) {
      setLoggedIn(true); setCurrentStore(user); setError("");
      localStorage.setItem('yurari_admin_store', user.id);
      localStorage.setItem('yurari_admin_expire', Date.now() + 12 * 60 * 60 * 1000);
    }
    else setError("パスワードが違います");
  };

  const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const fetchTodayReceived = async () => {
  const today = formatDate(new Date());
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?store_id=eq.${currentStore.id}&booking_date=eq.${today}&status=in.(received,treatment_done)&select=*,customers(name)&order=booking_time.asc`,
    { headers }
  );
  const data = await res.json();
  setTodayReceived(Array.isArray(data) ? data : []);
};

const handleAdminQrInput = async (value) => {
  setQrInput("");
  const match = value.match(/checkin=([^&\s]+)/);
  if (!match) {
    setCheckinResult({ status: "error", message: "QRコードが正しくありません" });
    setTimeout(() => setCheckinResult(null), 3000);
    return;
  }
  const identifier = match[1];
  let customer = null;
  const resId = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${identifier}&select=*`, { headers });
  const dataId = await resId.json();
  if (dataId && dataId.length > 0) {
    customer = dataId[0];
  } else {
    const resNum = await fetch(`${SUPABASE_URL}/rest/v1/customers?customer_number=eq.${identifier}&select=*`, { headers });
    const dataNum = await resNum.json();
    if (dataNum && dataNum.length > 0) customer = dataNum[0];
  }
  if (!customer) {
    setCheckinResult({ status: "error", message: "顧客が見つかりません" });
    setTimeout(() => setCheckinResult(null), 3000);
    return;
  }
  const today = formatDate(new Date());
  const resBooking = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?customer_id=eq.${customer.id}&booking_date=eq.${today}&status=eq.confirmed&order=booking_time.asc&limit=1`,
    { headers }
  );
  const bookingData = await resBooking.json();
  if (!bookingData || bookingData.length === 0) {
    setCheckinResult({ status: "error", message: `${customer.name}様の本日の予約が見つかりません` });
    setTimeout(() => setCheckinResult(null), 4000);
    return;
  }
  const booking = bookingData[0];
  await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking.id}`, {
    method: "PATCH", headers,
    body: JSON.stringify({ status: "received" }),
  });
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/assign_customer_number`, {
    method: "POST", headers,
    body: JSON.stringify({ p_customer_id: customer.id, p_store_id: currentStore.id }),
  });
  setCheckinResult({ status: "ok", message: `${customer.name}様 受付完了！` });
  setTimeout(() => setCheckinResult(null), 4000);
  fetchTodayReceived();
};
  const formatPrice = (p) => `¥${p.toLocaleString()}`;

  const fetchBookings = async (date, silent = false) => {
    if (!date) return;
    if (!silent) setLoading(true);
    const d = formatDate(date);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?store_id=eq.${currentStore.id}&booking_date=eq.${d}&select=*,customers(name,tel,kana,email,line_user_id)`, { headers });
    const data = await res.json();
    setBookings(Array.isArray(data) ? data : []);
    if (!silent) setLoading(false);
  };

  const fetchCompletedBookings = async (dateStr) => {
    const d = dateStr || formatDate(new Date());
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?store_id=eq.${currentStore.id}&booking_date=eq.${d}&status=eq.completed&select=*,customers(name,tel)&order=booking_time.asc`, { headers });
    const data = await res.json();
    if (!Array.isArray(data)) { setCompletedBookings([]); return; }
    // 各予約の支払い情報を取得
    const bookingsWithPayment = await Promise.all(data.map(async b => {
      const pRes = await fetch(`${SUPABASE_URL}/rest/v1/payments?booking_id=eq.${b.id}&select=*,payment_methods(method,amount)`, { headers });
      const pData = await pRes.json();
      const payment = Array.isArray(pData) && pData.length > 0 ? pData[0] : null;
      const piRes = await fetch(`${SUPABASE_URL}/rest/v1/payment_items?payment_id=eq.${payment?.id}&select=*`, { headers });
      const piData = await piRes.json();
      return { ...b, payment, paymentItems: Array.isArray(piData) ? piData : [] };
    }));
    setCompletedBookings(bookingsWithPayment);
  };

  const revertPayment = async (booking) => {
    if (!window.confirm("会計を取り消して再会計しますか？")) return;
    if (booking.payment) {
      await fetch(`${SUPABASE_URL}/rest/v1/payment_items?payment_id=eq.${booking.payment.id}`, { method: "DELETE", headers });
      await fetch(`${SUPABASE_URL}/rest/v1/payment_methods?payment_id=eq.${booking.payment.id}`, { method: "DELETE", headers });
      await fetch(`${SUPABASE_URL}/rest/v1/payments?id=eq.${booking.payment.id}`, { method: "DELETE", headers });
    }
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking.id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "treatment_done", completed_at: null }) });
    // ポイントを1点戻す
    const ptRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${booking.customer_id}&select=points`, { headers });
    const ptData = await ptRes.json();
    if (ptData && ptData[0] && ptData[0].points > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${booking.customer_id}`, { method: "PATCH", headers, body: JSON.stringify({ points: ptData[0].points - 1 }) });
    }
    setSelectedCompletedPayment(null);
    fetchCompletedBookings();
    fetchTodayBookings();
    // 再会計画面へ
    setCheckoutBooking({ ...booking, customers: booking.customers });
    // 施術メニューをcheckoutItemsにセット
    const course = courseMenus.find(c => c.name === booking.course_name);
    setCheckoutItems([{ type: "course", name: booking.course_name, price: course?.price || 0, quantity: 1 }]);
    setCheckoutDiscount(0);
    setCheckoutDiscountReason("");
    setCheckoutPaymentMethods([{ method: "cash", amount: 0 }]);
    setCheckoutTicketUse({ purchase: 0, present: 0 });
    fetchProducts();
    fetchCourseMenus();
    fetchSubMenus();
    fetchGiftTicketTemplates();
    fetchCustomerTickets(booking.customer_id);
  };

  const dropToStaging = () => {
    if (!draggedBooking || draggedBooking.isStaged) return;
    setStagedBookings(prev => prev.find(b => b.id === draggedBooking.id) ? prev : [...prev, draggedBooking]);
    setDraggedBooking(null);
    setDragOverCell(null);
    setDragOverStaging(false);
  };

  const dropBooking = async (targetStaffId, targetTime) => {
    if (!draggedBooking) return;
    const booking = draggedBooking;
    const targetStaff = staffList.find(s => s.id === targetStaffId);
    const targetDateStr = formatDate(selectedDate);
    const isStaged = booking.isStaged;
    const customerName = booking.customers?.name || "予約";
    const confirmMsg = isStaged
      ? `${customerName}さんの予約を${targetDateStr} ${targetTime}（担当：${targetStaff?.name}）に変更しますか？`
      : `${customerName}さんの予約を ${booking.booking_time} → ${targetTime}（担当：${targetStaff?.name}）に変更しますか？`;
    setDraggedBooking(null);
    setDragOverCell(null);
    setDragOverStaging(false);
    const confirmed = window.confirm(confirmMsg);
    if (!confirmed) return;
    const patch = isStaged
      ? { booking_date: targetDateStr, booking_time: targetTime, staff_id: targetStaffId, staff_name: targetStaff?.name }
      : { booking_time: targetTime, staff_id: targetStaffId, staff_name: targetStaff?.name };
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking.id}`, {
      method: "PATCH", headers,
      body: JSON.stringify(patch),
    });
    if (isStaged) setStagedBookings(prev => prev.filter(b => b.id !== booking.id));
    fetchAllSilent(selectedDate);
  };

  const fetchTodayBookings = async (dateStr) => {
    const d = dateStr || formatDate(new Date());
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?store_id=eq.${currentStore.id}&booking_date=eq.${d}&select=*,customers(name,tel)&order=booking_time.asc`, { headers });
    const data = await res.json();
    setTodayBookings(Array.isArray(data) ? data : []);
  };

  const printReceipt = () => {
    if (!checkoutResult) return;
    const win = window.open('', '_blank');
    const paymentMethodNames = (checkoutResult.paymentMethod || "").split(",").map(id => PAYMENT_METHODS.find(m => m.id === id)?.name || id).join(" / ");
    const itemsHtml = (checkoutResult.items || []).map(item =>
      `<tr><td>${item.name}</td><td style="text-align:right">¥${(item.price * item.quantity).toLocaleString()}</td></tr>`
    ).join("");
    const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        @page { size: 80mm auto; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: monospace; font-size: 12px; width: 72mm; padding: 4mm; }
        h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
        .sub { text-align: center; font-size: 11px; margin-bottom: 2px; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; vertical-align: top; }
        .total { font-size: 15px; font-weight: bold; }
        .right { text-align: right; }
        .center { text-align: center; }
        .footer { margin-top: 8px; font-size: 10px; text-align: center; }
      </style></head><body>
      <h1>整体院 癒楽里</h1>
      <p class="sub">${currentStore?.name || ""}</p>
      <p class="sub">${now}</p>
      <div class="line"></div>
      <p style="font-size:11px;margin-bottom:4px">${checkoutResult.customerName} 様</p>
      <table>
        ${itemsHtml}
      </table>
      <div class="line"></div>
      <table>
        <tr><td>小計</td><td class="right">¥${(checkoutResult.subtotal || 0).toLocaleString()}</td></tr>
        ${checkoutResult.discount > 0 ? `<tr><td>値引き${checkoutResult.discountReason ? "（" + checkoutResult.discountReason + "）" : ""}</td><td class="right">-¥${checkoutResult.discount.toLocaleString()}</td></tr>` : ""}
        <tr class="total"><td>合計</td><td class="right">¥${(checkoutResult.total || 0).toLocaleString()}</td></tr>
      </table>
      <div class="line"></div>
      <p style="font-size:11px">お支払い：${paymentMethodNames}</p>
      <div class="footer">
        <p>ありがとうございました</p>
        <p>またのご来院をお待ちしております</p>
      </div>
      <script>setTimeout(() => { window.print(); window.close(); }, 500);<\/script>
      </body></html>
    `);
    win.document.close();
  };

  const printMemberCard = (customer) => {
    const win = window.open('', '_blank');
    const sName = currentStore?.name || '南浦和本院';
    const cNum = customer.customer_number || '';
    const cName = customer.name || '';
    const qUrl = 'https://yurari-booking.vercel.app/admin?checkin=' + cNum;
    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>会員カード</title>'
      + '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>'
      + '<style>'
      + '* { margin: 0; padding: 0; box-sizing: border-box; }'
      + '@page { size: 85.6mm 54mm; margin: 0; }'
      + 'html, body { width: 85.6mm; height: 54mm; overflow: hidden; background: white; }'
      + 'body { font-family: sans-serif; }'
      + '.card { width: 85.6mm; height: 54mm; padding: 3mm; display: flex; flex-direction: column; justify-content: space-between; }'
      + '.top { display: flex; justify-content: space-between; align-items: center; }'
      + '.logo { height: 16mm; width: auto; }'
      + '#qr img, #qr canvas { width: 16mm !important; height: 16mm !important; }'
      + '.bottom { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 2mm; border-top: 0.3pt solid #ddd; }'
      + '.name { font-size: 11pt; font-weight: bold; color: #1a1a1a; }'
      + '.number { font-size: 9pt; color: #2d6a4f; font-weight: bold; }'
      + '<\/style><\/head><body>'
      + '<div class="card">'
      + '<div class="top">'
      + '<img class="logo" src="https://seitai-yurari.com/wp-content/uploads/2025/11/logo.webp" \/>'
      + '<div id="qr"><\/div>'
      + '<\/div>'
      + '<div class="bottom">'
      + '<div class="name">' + cName + '<\/div>'
      + '<div class="number">' + cNum + '<\/div>'
      + '<\/div>'
      + '<\/div>'
      + '<script>new QRCode(document.getElementById("qr"),{text:"' + qUrl + '",width:61,height:61,correctLevel:QRCode.CorrectLevel.M});setTimeout(()=>window.print(),800);<\/script>'
      + '<\/body><\/html>';
    win.document.write(html);
    win.document.close();
  };

  const findDuplicates = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?is_deleted=eq.false&select=id,name,tel,email,line_user_id,customer_number,points`, { headers });
    const data = await res.json();
    if (!Array.isArray(data)) return;
    const groups = {};
    data.forEach(c => {
      if (c.tel) { const key = `tel:${c.tel}`; if (!groups[key]) groups[key] = []; groups[key].push(c); }
      if (c.name) { const key = `name:${c.name}`; if (!groups[key]) groups[key] = []; groups[key].push(c); }
    });
    const seen = new Set();
    const uniqueDupes = Object.values(groups).filter(g => g.length > 1).filter(g => {
      const key = g.map(c => c.id).sort().join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setDuplicates(uniqueDupes);
    setShowDuplicates(true);
  };

  const mergeCustomers = async (targetId, sourceId) => {
    if (!window.confirm("2つの顧客を統合します。統合元は削除されます。よいですか？")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?customer_id=eq.${sourceId}`, { method: "PATCH", headers, body: JSON.stringify({ customer_id: targetId }) });
    await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets?customer_id=eq.${sourceId}`, { method: "PATCH", headers, body: JSON.stringify({ customer_id: targetId }) });
    await fetch(`${SUPABASE_URL}/rest/v1/notifications?customer_id=eq.${sourceId}`, { method: "PATCH", headers, body: JSON.stringify({ customer_id: targetId }) });
    await fetch(`${SUPABASE_URL}/rest/v1/payments?customer_id=eq.${sourceId}`, { method: "PATCH", headers, body: JSON.stringify({ customer_id: targetId }) });
    await fetch(`${SUPABASE_URL}/rest/v1/line_messages?customer_id=eq.${sourceId}`, { method: "PATCH", headers, body: JSON.stringify({ customer_id: targetId }) });
    const srcRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${sourceId}&select=points,line_user_id`, { headers });
    const srcData = await srcRes.json();
    const tgtRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${targetId}&select=points,line_user_id`, { headers });
    const tgtData = await tgtRes.json();
    const newPoints = (tgtData[0]?.points || 0) + (srcData[0]?.points || 0);
    const updateData = { points: newPoints };
    if (!tgtData[0]?.line_user_id && srcData[0]?.line_user_id) updateData.line_user_id = srcData[0].line_user_id;
    await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${targetId}`, { method: "PATCH", headers, body: JSON.stringify(updateData) });
    await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${sourceId}`, { method: "DELETE", headers });
    setMergeTarget(null);
    setMergeSource(null);
    setShowDuplicates(false);
    fetchCustomers();
    alert("統合完了しました");
  };

  const deleteCustomer = async (customerId, permanent = false) => {
    if (permanent) {
      if (!window.confirm("完全に削除します。予約履歴等も全て削除されます。本当によいですか？")) return;
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?customer_id=eq.${customerId}`, { method: "DELETE", headers });
      await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets?customer_id=eq.${customerId}`, { method: "DELETE", headers });
      await fetch(`${SUPABASE_URL}/rest/v1/notifications?customer_id=eq.${customerId}`, { method: "DELETE", headers });
      await fetch(`${SUPABASE_URL}/rest/v1/payments?customer_id=eq.${customerId}`, { method: "DELETE", headers });
      await fetch(`${SUPABASE_URL}/rest/v1/line_messages?customer_id=eq.${customerId}`, { method: "DELETE", headers });
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?customer_id=eq.${customerId}`, { method: "DELETE", headers });
      await fetch(`${SUPABASE_URL}/rest/v1/admin_notifications?customer_id=eq.${customerId}`, { method: "DELETE", headers });
      await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}`, { method: "DELETE", headers });
    } else {
      if (!window.confirm("この顧客を非表示にします。よいですか？")) return;
      await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ is_deleted: true }),
      });
    }
    setSelectedCustomer(null);
    fetchCustomers();
  };

  const fetchCustomerDetail = async (customerId) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}&select=*`, { headers });
    const data = await res.json();
    if (data && data[0]) setSelectedCustomer(data[0]);
  };

  const fetchDailyReport = async (dateStr) => {
    // JST 0:00〜23:59 をUTCに変換（UTC = JST - 9h）
    const utcStart = new Date(`${dateStr}T00:00:00+09:00`).toISOString().slice(0, 19);
    const utcEnd   = new Date(`${dateStr}T23:59:59+09:00`).toISOString().slice(0, 19);
    const [paymentsRes, bookingsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/payments?store_id=eq.${currentStore.id}&created_at=gte.${utcStart}&created_at=lte.${utcEnd}&select=*,payment_methods(method,amount)`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/bookings?store_id=eq.${currentStore.id}&booking_date=eq.${dateStr}&select=*,customers(name)`, { headers }),
    ]);
    const payments = await paymentsRes.json();
    const bookings = await bookingsRes.json();

    const validPayments = Array.isArray(payments) ? payments : [];
    const validBookings = Array.isArray(bookings) ? bookings : [];

    // 売上集計
    const totalSales = validPayments.reduce((s, p) => s + (p.total || 0), 0);
    const totalDiscount = validPayments.reduce((s, p) => s + (p.discount || 0), 0);

    // 金種別集計（method を常に ID に正規化 + 金種合計を p.total に揃える）
    const normalizeMethod = (raw) => {
      if (!raw) return "cash";
      if (PAYMENT_METHODS.find(m => m.id === raw)) return raw;
      const found = PAYMENT_METHODS.find(m => m.name === raw);
      if (found) return found.id;
      return raw;
    };
    const methodTotals = {};
    validPayments.forEach(p => {
      const paymentTotal = p.total || 0;
      if (p.payment_methods && p.payment_methods.length > 0) {
        const pmSum = p.payment_methods.reduce((s, pm) => s + (pm.amount || 0), 0);
        if (pmSum === 0) {
          // 金額未入力の場合は payment_method 文字列を使う
          const mid = normalizeMethod(p.payment_method);
          methodTotals[mid] = (methodTotals[mid] || 0) + paymentTotal;
        } else {
          // 金種別金額を p.total 比率で按分し、端数は最後の金種に集約
          let remaining = paymentTotal;
          p.payment_methods.forEach((pm, idx) => {
            const mid = normalizeMethod(pm.method);
            const amount = idx < p.payment_methods.length - 1
              ? Math.round(pm.amount * paymentTotal / pmSum)
              : remaining;
            methodTotals[mid] = (methodTotals[mid] || 0) + amount;
            remaining -= amount;
          });
        }
      } else {
        const mid = normalizeMethod(p.payment_method);
        methodTotals[mid] = (methodTotals[mid] || 0) + paymentTotal;
      }
    });

    // 予約集計
    const confirmed = validBookings.filter(b => b.status !== "cancelled");
    const cancelled = validBookings.filter(b => b.status === "cancelled");

    // スタッフ別
    const staffCount = {};
    confirmed.forEach(b => {
      staffCount[b.staff_name] = (staffCount[b.staff_name] || 0) + 1;
    });

    // コース別
    const courseCount = {};
    confirmed.forEach(b => {
      courseCount[b.course_name] = (courseCount[b.course_name] || 0) + 1;
    });

    setDailyReport({ totalSales, totalDiscount, methodTotals, customerCount: validPayments.length, cancelCount: cancelled.length, staffCount, courseCount, payments: validPayments, bookings: validBookings });
  };

  const fetchMonthlyReport = async (monthStr) => {
    if (!currentStore) return;
    setMonthlyReportLoading(true);
    setMonthlyReport(null);
    try {
      const [yearN, monthN] = monthStr.split('-').map(Number);
      const lastDayN = new Date(yearN, monthN, 0).getDate();
      const curStart = `${monthStr}-01`;
      const curEnd = `${monthStr}-${String(lastDayN).padStart(2,'0')}`;

      // 直近6ヶ月の月リスト（古い順）
      const histMonths = [];
      for (let i = 5; i >= 0; i--) {
        let y = yearN, m = monthN - i;
        while (m <= 0) { m += 12; y--; }
        histMonths.push(`${y}-${String(m).padStart(2,'0')}`);
      }
      const h6Start = histMonths[0] + '-01';
      const [h6y, h6m] = histMonths[5].split('-').map(Number);
      const h6End = `${histMonths[5]}-${String(new Date(h6y, h6m, 0).getDate()).padStart(2,'0')}`;

      // 前年同月
      const pyYear = yearN - 1;
      const pyMonthStr = `${pyYear}-${String(monthN).padStart(2,'0')}`;
      const pyLastDay = new Date(pyYear, monthN, 0).getDate();
      const pyStart = `${pyMonthStr}-01`;
      const pyEnd = `${pyMonthStr}-${String(pyLastDay).padStart(2,'0')}`;

      // UTC変換（payments用）
      const toUtcStr = (dateStr, time) => new Date(`${dateStr}T${time}+09:00`).toISOString().slice(0,19);
      const h6UtcStart = toUtcStr(h6Start, '00:00:00');
      const h6UtcEnd = toUtcStr(h6End, '23:59:59');
      const pyUtcStart = toUtcStr(pyStart, '00:00:00');
      const pyUtcEnd = toUtcStr(pyEnd, '23:59:59');

      // 並列フェッチ
      const [bookingsRaw, paymentsRaw, pyPayRaw, pyBookRaw, shiftsRaw] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/bookings?store_id=eq.${currentStore.id}&booking_date=gte.${h6Start}&booking_date=lte.${h6End}&select=id,customer_id,staff_id,staff_name,booking_date,status&order=booking_date.asc`, { headers }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/rest/v1/payments?store_id=eq.${currentStore.id}&created_at=gte.${h6UtcStart}&created_at=lte.${h6UtcEnd}&select=id,booking_id,total,created_at`, { headers }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/rest/v1/payments?store_id=eq.${currentStore.id}&created_at=gte.${pyUtcStart}&created_at=lte.${pyUtcEnd}&select=total`, { headers }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/rest/v1/bookings?store_id=eq.${currentStore.id}&booking_date=gte.${pyStart}&booking_date=lte.${pyEnd}&select=id,status,staff_name`, { headers }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/rest/v1/shifts?store_id=eq.${currentStore.id}&work_date=gte.${curStart}&work_date=lte.${curEnd}&select=staff_id,work_date`, { headers }).then(r => r.json()),
      ]);

      const allBookings = Array.isArray(bookingsRaw) ? bookingsRaw : [];
      const allPayments = Array.isArray(paymentsRaw) ? paymentsRaw : [];
      const pyPayments = Array.isArray(pyPayRaw) ? pyPayRaw : [];
      const pyBookings = Array.isArray(pyBookRaw) ? pyBookRaw : [];
      const shiftsData = Array.isArray(shiftsRaw) ? shiftsRaw : [];

      const validBookings = allBookings.filter(b => b.status !== 'cancelled');

      // 当月のpayments
      const payToJstMonth = (p) => {
        if (!p.created_at) return null;
        const s = /[Z+]/.test(p.created_at) ? p.created_at : p.created_at + 'Z';
        const jst = new Date(new Date(s).getTime() + 9 * 3600000);
        return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth()+1).padStart(2,'0')}`;
      };
      const curPayments = allPayments.filter(p => payToJstMonth(p) === monthStr);

      // payment_items（当月のみ、100件ごとチャンク）
      let allItems = [];
      const payIds = curPayments.map(p => p.id);
      for (let i = 0; i < payIds.length; i += 100) {
        const chunk = payIds.slice(i, i+100);
        const raw = await fetch(`${SUPABASE_URL}/rest/v1/payment_items?payment_id=in.(${chunk.join(',')})&select=payment_id,item_type,item_name,price,quantity`, { headers }).then(r => r.json());
        if (Array.isArray(raw)) allItems = allItems.concat(raw);
      }

      // 顧客のfirst_visit（100件ごとチャンク）
      const custIds = [...new Set(validBookings.map(b => b.customer_id).filter(Boolean))];
      const custMap = {};
      for (let i = 0; i < custIds.length; i += 100) {
        const chunk = custIds.slice(i, i+100);
        const raw = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=in.(${chunk.join(',')})&select=id,first_visit`, { headers }).then(r => r.json());
        if (Array.isArray(raw)) raw.forEach(c => { custMap[c.id] = c; });
      }

      // 初回来店月マップ（customers.first_visitを優先、なければ6ヶ月データの最古）
      const firstVisitM = {};
      custIds.forEach(id => {
        if (custMap[id]?.first_visit) firstVisitM[id] = custMap[id].first_visit.slice(0,7);
      });
      validBookings.forEach(b => {
        if (!b.customer_id || firstVisitM[b.customer_id]) return;
        const ms = b.booking_date.slice(0,7);
        if (!firstVisitM[b.customer_id] || ms < firstVisitM[b.customer_id]) firstVisitM[b.customer_id] = ms;
      });

      // 月別グループ
      const mData = {};
      histMonths.forEach(ms => { mData[ms] = { bookings: [], payments: [], visitC: new Set(), newC: new Set(), repC: new Set() }; });
      validBookings.forEach(b => {
        const ms = b.booking_date.slice(0,7);
        if (!mData[ms]) return;
        mData[ms].bookings.push(b);
        if (b.customer_id) {
          mData[ms].visitC.add(b.customer_id);
          if (firstVisitM[b.customer_id] === ms) mData[ms].newC.add(b.customer_id);
          else mData[ms].repC.add(b.customer_id);
        }
      });
      allPayments.forEach(p => {
        const ms = payToJstMonth(p);
        if (ms && mData[ms]) mData[ms].payments.push(p);
      });

      // スタッフ別出勤日数
      const staffWorkDays = {};
      shiftsData.filter(s => s.staff_id !== 'closed').forEach(s => {
        if (!staffWorkDays[s.staff_id]) staffWorkDays[s.staff_id] = new Set();
        staffWorkDays[s.staff_id].add(s.work_date);
      });

      // payment lookup
      const payByBookId = {};
      curPayments.forEach(p => { payByBookId[p.booking_id] = p; });
      const itemsByPayId = {};
      allItems.forEach(item => {
        if (!itemsByPayId[item.payment_id]) itemsByPayId[item.payment_id] = [];
        itemsByPayId[item.payment_id].push(item);
      });

      // スタッフ別実績（当月）
      const staffMap2 = {};
      (mData[monthStr]?.bookings || []).forEach(b => {
        if (!b.staff_name) return;
        if (!staffMap2[b.staff_name]) staffMap2[b.staff_name] = { name: b.staff_name, staffId: b.staff_id, count: 0, custIds: new Set(), newCount: 0, courseSales: 0, productSales: 0, nomineeSales: 0 };
        const s = staffMap2[b.staff_name];
        s.count++;
        if (b.customer_id) {
          s.custIds.add(b.customer_id);
          if (firstVisitM[b.customer_id] === monthStr) s.newCount++;
        }
        const pay = payByBookId[b.id];
        if (pay) {
          const items = itemsByPayId[pay.id] || [];
          if (items.length > 0) {
            items.forEach(item => {
              const amt = (item.price || 0) * (item.quantity || 1);
              if (item.item_type === 'course') s.courseSales += amt;
              else if (item.item_type === 'product') s.productSales += amt;
              else if (item.item_type === 'submenu' && (item.item_name || '').includes('指名')) s.nomineeSales += amt;
            });
          } else {
            s.courseSales += (pay.total || 0);
          }
        }
      });

      // 当月サマリー
      const curMd = mData[monthStr] || { bookings: [], payments: [], visitC: new Set(), newC: new Set(), repC: new Set() };
      const curSales = curMd.payments.reduce((s, p) => s + (p.total || 0), 0);
      const curNominee = curMd.bookings.filter(b => NOMINEE_STAFFS.includes(b.staff_name)).length;

      // 前月比
      const prevIdx = histMonths.indexOf(monthStr) - 1;
      const prevMs = prevIdx >= 0 ? histMonths[prevIdx] : null;
      const prevSales = prevMs && mData[prevMs] ? mData[prevMs].payments.reduce((s, p) => s + (p.total || 0), 0) : null;
      const prevMonthRatio = (prevSales !== null && prevSales > 0) ? Math.round(curSales / prevSales * 100) : null;

      // 前年比
      const pySales = pyPayments.reduce((s, p) => s + (p.total || 0), 0);
      const prevYearRatio = pySales > 0 ? Math.round(curSales / pySales * 100) : null;

      // 着地予測（当月のみ日割り、過去月はそのまま）
      const jstNow = new Date(Date.now() + 9 * 3600000);
      const nowJstMs = `${jstNow.getUTCFullYear()}-${String(jstNow.getUTCMonth()+1).padStart(2,'0')}`;
      const isCurrentMonth = monthStr === nowJstMs;
      const elapsed = isCurrentMonth ? jstNow.getUTCDate() : lastDayN;
      const projected = (elapsed > 0 && isCurrentMonth) ? Math.round(curSales / elapsed * lastDayN) : curSales;

      // 6ヶ月ヒストリー
      const history = histMonths.map((ms, idx) => {
        const md = mData[ms] || { bookings: [], payments: [], newC: new Set(), repC: new Set() };
        const sales = md.payments.reduce((s, p) => s + (p.total || 0), 0);
        const prevMd = idx > 0 ? mData[histMonths[idx-1]] : null;
        const prevS = prevMd ? prevMd.payments.reduce((s, p) => s + (p.total || 0), 0) : null;
        return {
          month: ms,
          totalVisits: md.bookings.length,
          newCount: md.newC?.size || 0,
          repeatCount: md.repC?.size || 0,
          totalSales: sales,
          nomineeCount: md.bookings.filter(b => NOMINEE_STAFFS.includes(b.staff_name)).length,
          prevMonthRatio: (prevS !== null && prevS > 0) ? Math.round(sales / prevS * 100) : null,
        };
      });

      setMonthlyReport({
        month: monthStr,
        totalVisits: curMd.bookings.length,
        newCount: curMd.newC?.size || 0,
        repeatCount: curMd.repC?.size || 0,
        nomineeCount: curNominee,
        totalSales: curSales,
        projected,
        isCurrentMonth,
        prevMonthRatio,
        prevYearRatio,
        history,
        staffBreakdown: Object.values(staffMap2).sort((a, b) => b.count - a.count),
        staffWorkDays,
      });
    } catch (e) {
      console.error('[fetchMonthlyReport]', e);
      alert('月報の読み込みに失敗しました: ' + e.message);
    } finally {
      setMonthlyReportLoading(false);
    }
  };

  const saveMonthlyTarget = async () => {
    const val = parseInt(monthlyTargetInput) || 0;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/store_settings?store_id=eq.${currentStore.id}`, {
        method: "PATCH", headers, body: JSON.stringify({ monthly_target: val })
      });
      await fetchStoreSettings();
      setEditingMonthlyTarget(false);
    } catch (e) {
      alert('目標の保存に失敗しました: ' + e.message);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?is_deleted=eq.false&order=created_at.desc&limit=1000`, { headers });
    const data = await res.json();
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

 const fetchCustomerHistory = async (customerId) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?customer_id=eq.${customerId}&order=booking_date.desc&select=*`, { headers });
    const data = await res.json();
    setCustomerHistory(Array.isArray(data) ? data : []);
  };

  const fetchVisitDetail = async (bookingId) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/payments?booking_id=eq.${bookingId}&select=*`, { headers });
    const data = await res.json();
    if (data && data.length > 0) {
      setVisitPayment(data[0]);
      const itemRes = await fetch(`${SUPABASE_URL}/rest/v1/payment_items?payment_id=eq.${data[0].id}&select=*`, { headers });
      const itemData = await itemRes.json();
      setVisitPaymentItems(Array.isArray(itemData) ? itemData : []);
    } else {
      setVisitPayment(null);
      setVisitPaymentItems([]);
    }
  };
  const fetchBlocks = async (date) => {
    if (!date) return;
    const d = formatDate(date);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blocks?store_id=eq.${currentStore.id}&block_date=eq.${d}`, { headers });
    const data = await res.json();
    setBlocks(Array.isArray(data) ? data : []);
  };

  const toggleBlock = async (staffId, time) => {
    const existing = blocks.find(b => (b.staff_id === staffId || b.staff_id === "all") && (b.block_time === time || b.block_time === time + ":00"));
    if (existing) {
      await fetch(`${SUPABASE_URL}/rest/v1/blocks?id=eq.${existing.id}`, { method: "DELETE", headers });
      fetchBlocks(selectedDate);
    }
  };

  const saveChangeBooking = async () => {
    const f = changeBookingForm;
    if (!f.booking_date || !f.booking_time || !f.course_id) return;
    const course = courseMenus.find(c => c.id === f.course_id);
    const staff = staffMembers.find(s => s.id === f.staff_id);
    const num = `YR-${Date.now().toString().slice(-8)}`;
    // 新規予約を作成
    await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: "POST", headers,
      body: JSON.stringify({
        store_id: currentStore.id,
        customer_id: changeBookingModal.customer_id,
        staff_id: f.staff_id,
        course_id: f.course_id,
        booking_date: f.booking_date,
        booking_time: f.booking_time,
        course_name: course?.name || "",
        course_duration: f.course_duration || course?.duration || "30分",
        staff_name: staff?.name || "",
        status: "confirmed",
        notes: f.notes || "",
        booking_number: num,
        source: "direct",
      }),
    });
    // 元の予約をキャンセル
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${changeBookingModal.id}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status: "cancelled", cancelled_at: new Date().toISOString() }),
    });
    // マイページ通知
    if (changeBookingModal.customer_id) {
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: "POST", headers,
        body: JSON.stringify({
          customer_id: changeBookingModal.customer_id,
          store_id: currentStore.id,
          title: "予約変更のお知らせ",
          body: f.booking_date + " " + f.booking_time + " " + (course?.name || "") + "（" + (staff?.name || "") + "）に変更されました。",
          is_read: false,
          sent_via: "system",
        }),
      });
    }
    setChangeBookingModal(null);
    setChangeBookingForm({});
    setSelectedBooking(null);
    fetchAll(selectedDate);
  };

  const addBlock = async () => {
    if (!blockModal) return;
    const d = formatDate(selectedDate);
    const { staffId, time } = blockModal;
    const TIME_SLOTS_ALL = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30"];
    const startIdx = TIME_SLOTS_ALL.indexOf(time);
    for (let i = 0; i < blockDuration; i++) {
      const t = TIME_SLOTS_ALL[startIdx + i];
      if (!t) break;
      await fetch(`${SUPABASE_URL}/rest/v1/blocks`, {
        method: "POST", headers,
        body: JSON.stringify({ store_id: currentStore.id, staff_id: staffId, block_date: d, block_time: t + ":00", block_type: "manual", reason: blockReason }),
      });
    }
    setBlockModal(null);
    setBlockReason("");
    setBlockDuration(1);
    fetchBlocks(selectedDate);
  };

  const fetchShifts = async (date) => {
    if (!date) return;
    const d = formatDate(date);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/shifts?store_id=eq.${currentStore.id}&work_date=eq.${d}`, { headers });
    const data = await res.json();
    setShifts(Array.isArray(data) ? data : []);
  };

  const fetchExtensions = async (date) => {
    if (!date) return;
    const d = formatDate(date);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/time_extensions?store_id=eq.${currentStore.id}&extension_date=eq.${d}&order=created_at.desc&limit=1`, { headers });
    const data = await res.json();
    setExtensions(Array.isArray(data) ? data : []);
  };

  const fetchMonthShifts = async () => {
    const year = shiftMonth.getFullYear();
    const month = String(shiftMonth.getMonth()+1).padStart(2,"0");
    const from = `${year}-${month}-01`;
    const lastDay = new Date(year, shiftMonth.getMonth()+1, 0).getDate();
    const to = `${year}-${month}-${lastDay}`;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/shifts?store_id=eq.${currentStore.id}&work_date=gte.${from}&work_date=lte.${to}`, { headers });
    const data = await res.json();
    setMonthShifts(Array.isArray(data) ? data : []);
  };

  const fetchShiftPlans = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/shift_plans?store_id=eq.${currentStore.id}&order=created_at.asc`, { headers });
    const data = await res.json();
    setShiftPlans(Array.isArray(data) ? data : []);
  };

  const fetchProducts = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?store_id=eq.${currentStore.id}&order=sort_order.asc`, { headers });
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
  };

  const fetchStaffMembers = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/staff_members?store_id=eq.${currentStore.id}&order=sort_order.asc`, { headers });
    const data = await res.json();
    setStaffMembers(Array.isArray(data) ? data : []);
  };

  const fetchCourseMenus = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/course_menus?order=sort_order.asc`, { headers });
    const data = await res.json();
    setCourseMenus(Array.isArray(data) ? data : []);
  };

  const fetchSubMenus = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sub_menus?store_id=eq.${currentStore.id}&order=sort_order.asc`, { headers });
    if (!res.ok) {
      console.warn("[fetchSubMenus] エラー:", res.status, await res.text());
      setSubMenus([]);
      return;
    }
    const data = await res.json();
    setSubMenus(Array.isArray(data) ? data : []);
  };

  const fetchStoreSettings = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/store_settings?store_id=eq.${currentStore.id}`, { headers });
    const data = await res.json();
    if (data[0]) { setStoreSettings(data[0]); setLeadTime(data[0].same_day_lead_time); }
  };

  const fetchGiftTicketTemplates = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gift_ticket_templates?store_id=eq.${currentStore.id}&order=sort_order.asc`, { headers });
    const data = await res.json();
    setGiftTicketTemplates(Array.isArray(data) ? data : []);
  };

  const fetchCustomerTickets = async (customerId) => {
    if (!customerId) return;
    const today = formatDate(new Date());
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets?customer_id=eq.${customerId}&status=eq.active&expires_at=gte.${today}&order=expires_at.asc`, { headers });
    const data = await res.json();
    setCustomerTickets(Array.isArray(data) ? data : []);
  };

  const fetchAllCustomerTickets = async () => {
    if (!currentStore?.id) return;
    const today = formatDate(new Date());
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets?status=eq.active&expires_at=gte.${today}&select=customer_id,ticket_type`, { headers });
    const data = await res.json();
    if (!Array.isArray(data)) return;
    const map = {};
    data.forEach(t => {
      if (!map[t.customer_id]) map[t.customer_id] = { purchase: 0, present: 0 };
      if (t.ticket_type === "purchase") map[t.customer_id].purchase++;
      else if (t.ticket_type === "present") map[t.customer_id].present++;
    });
    setAllCustomerTickets(map);
  };

  const saveTicketEdit = async () => {
    if (!editTicketModal) return;
    const { customer, type, count, date } = editTicketModal;
    const today = formatDate(new Date());
    // 既存の同タイプの有効チケットを削除
    await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets?customer_id=eq.${customer.id}&store_id=eq.${currentStore.id}&ticket_type=eq.${type}&status=eq.active`, {
      method: "DELETE", headers,
    });
    // 新しいチケットをINSERT
    const issuedDate = date || today;
    const expiresDate = (() => {
      const d = new Date(issuedDate);
      d.setFullYear(d.getFullYear() + 1);
      return formatDate(d);
    })();
    for (let i = 0; i < count; i++) {
      await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets`, {
        method: "POST", headers,
        body: JSON.stringify({
          customer_id: customer.id,
          store_id: currentStore.id,
          ticket_type: type,
          ticket_name: type === "purchase" ? "購入金券" : "プレゼント金券",
          face_value: 1000,
          issued_at: issuedDate,
          expires_at: expiresDate,
          status: "active",
        }),
      });
    }
    setEditTicketModal(null);
    await fetchAllCustomerTickets();
  };

  const issueGiftTicket = async (template) => {
    if (!checkoutBooking?.customer_id) { alert("顧客情報がない場合は金券を発行できません"); return; }
    const today = new Date();
    const expires = new Date(today);
    expires.setDate(expires.getDate() + (template.valid_days || 365));
    await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets`, {
      method: "POST", headers,
      body: JSON.stringify({
        store_id: currentStore.id,
        customer_id: checkoutBooking.customer_id,
        ticket_name: template.name,
        face_value: template.face_value,
        remaining_value: template.face_value,
        issued_at: formatDate(today),
        expires_at: formatDate(expires),
        status: "active",
      }),
    });
    await fetchCustomerTickets(checkoutBooking?.customer_id);
    const ticketItem = { type: "ticket_issue", name: `金券発行：${template.name}`, price: template.face_value, quantity: 1 };
    setCheckoutItems(prev => [...prev, ticketItem]);
  };

  const useGiftTicket = async (ticket, useAmount) => {
    const use = Math.min(useAmount, ticket.remaining_value, total);
    if (use <= 0) return;
    const newRemaining = ticket.remaining_value - use;
    await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets?id=eq.${ticket.id}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ remaining_value: newRemaining, status: newRemaining <= 0 ? "used" : "active" }),
    });
    setSelectedTicket({ ...ticket, use_amount: use });
    setCustomerTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, remaining_value: newRemaining } : t));
  };

  const saveGiftTicketTemplate = async () => {
    if (!editingTicketTemplate?.name || !editingTicketTemplate?.face_value) return;
    if (editingTicketTemplate.id) {
      await fetch(`${SUPABASE_URL}/rest/v1/gift_ticket_templates?id=eq.${editingTicketTemplate.id}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ name: editingTicketTemplate.name, face_value: parseInt(editingTicketTemplate.face_value), valid_days: parseInt(editingTicketTemplate.valid_days) || 365, is_active: editingTicketTemplate.is_active }),
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/gift_ticket_templates`, {
        method: "POST", headers,
        body: JSON.stringify({ store_id: currentStore.id, name: editingTicketTemplate.name, face_value: parseInt(editingTicketTemplate.face_value), valid_days: parseInt(editingTicketTemplate.valid_days) || 365, is_active: true, sort_order: giftTicketTemplates.length + 1 }),
      });
    }
    await fetchGiftTicketTemplates();
    setEditingTicketTemplate(null);
  };

  const saveStoreSettings = async () => {
    await fetch(`${SUPABASE_URL}/rest/v1/store_settings?store_id=eq.${currentStore.id}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ same_day_lead_time: leadTime, updated_at: new Date().toISOString() }),
    });
    await fetchStoreSettings();
    setEditingSettings(false);
    alert("保存しました");
  };

  const searchCustomerByNumber = async (query) => {
    if (!query) { setCustomerSearchResult(null); return; }
    const isNumber = query.split("").every(c => c >= "0" && c <= "9");
    const url = isNumber
      ? `${SUPABASE_URL}/rest/v1/customers?customer_number=eq.${query}`
      : `${SUPABASE_URL}/rest/v1/customers?name=ilike.*${query}*&limit=50`;
    const res = await fetch(url, { headers });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      setCustomerSearchResults(data);
      setCustomerSearchResult(data[0]);
      if (data.length === 1) {
        setDirectBookingForm(f => ({ ...f, customer_id: data[0].id, customer_name: data[0].name, customer_kana: data[0].kana || "", tel: data[0].tel || "" }));
      }
    } else {
      setCustomerSearchResults([]);
      setCustomerSearchResult(null);
      setDirectBookingForm(f => ({ ...f, customer_id: null, customer_name: "", customer_kana: "", tel: "" }));
    }
  };

  const saveDirectBooking = async () => {
    if (isSavingDirectBooking) return;
    const f = directBookingForm;
    if (directBookingMode === "normal" && (!f.customer_name || !f.course_id)) return;
    if (directBookingMode === "product" && (!f.customer_name || !directBookingProducts.some(p => p.name && p.price))) return;
    setIsSavingDirectBooking(true);
    let customerId = f.customer_id;
    if (!customerId && f.customer_name) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
        method: "POST", headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ name: f.customer_name, kana: f.customer_kana || "", tel: f.tel || "", email: f.email || "" }),
      });
      const data = await res.json();
      if (!Array.isArray(data) || !data[0]?.id) {
        alert("顧客の登録に失敗しました。\n" + JSON.stringify(data));
        setIsSavingDirectBooking(false);
        return;
      }
      customerId = data[0].id;
    }
    const staff = staffMembers.find(s => s.id === f.staff_id);
    const bookingDate = formatDate(directBookingModal.date);
    const num = `YR-${Date.now().toString().slice(-8)}`;
    const savedDate = directBookingModal.date;

    if (directBookingMode === "product") {
      const validProducts = directBookingProducts.filter(p => p.name && p.price);
      const total = validProducts.reduce((sum, p) => sum + Number(p.price) * Number(p.quantity || 1), 0);
      const bookingRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
        method: "POST", headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({
          store_id: currentStore.id,
          customer_id: customerId || null,
          staff_id: f.staff_id || null,
          booking_date: bookingDate,
          booking_time: directBookingModal.time,
          course_name: "物販",
          course_duration: "0分",
          staff_name: staff?.name || "",
          status: "confirmed",
          notes: f.notes || "",
          booking_number: num,
          course_id: null,
          source: "direct",
        }),
      });
      const bookingData = await bookingRes.json();
      if (!Array.isArray(bookingData) || !bookingData[0]?.id) {
        alert("予約の登録に失敗しました。\n" + JSON.stringify(bookingData));
        setIsSavingDirectBooking(false);
        return;
      }
      const bookingId = bookingData[0].id;
      const payRes = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
        method: "POST", headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({
          store_id: currentStore.id,
          booking_id: bookingId,
          customer_id: customerId || null,
          subtotal: total,
          discount: 0,
          total: total,
          payment_method: "cash",
          payment_status: "paid",
          notes: "",
        }),
      });
      const payData = await payRes.json();
      if (!Array.isArray(payData) || !payData[0]?.id) {
        // paymentsのINSERT失敗 → bookingをロールバック
        await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, { method: "DELETE", headers });
        alert("売上の登録に失敗しました。予約も取り消しました。\n" + JSON.stringify(payData));
        setIsSavingDirectBooking(false);
        return;
      }
      const paymentId = payData[0].id;
      const itemsRes = await fetch(`${SUPABASE_URL}/rest/v1/payment_items`, {
        method: "POST", headers,
        body: JSON.stringify(validProducts.map(p => ({
          payment_id: paymentId,
          item_name: p.name,
          item_type: "product",
          price: Number(p.price),
          quantity: Number(p.quantity || 1),
        }))),
      });
      if (!itemsRes.ok) {
        // 明細INSERT失敗 → payment・bookingをロールバック
        await fetch(`${SUPABASE_URL}/rest/v1/payments?id=eq.${paymentId}`, { method: "DELETE", headers });
        await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, { method: "DELETE", headers });
        alert("商品明細の登録に失敗しました。登録を取り消しました。ステータス：" + itemsRes.status);
        setIsSavingDirectBooking(false);
        return;
      }
      // 物販のみは会計が完了しているので即 completed にして二重会計を防止
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ status: "completed", completed_at: new Date().toISOString() }),
      });
    } else {
      const course = courseMenus.find(c => c.id === f.course_id);
      const bookingRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
        method: "POST", headers,
        body: JSON.stringify({
          store_id: currentStore.id,
          customer_id: customerId || null,
          staff_id: f.staff_id,
          course_id: f.course_id,
          booking_date: bookingDate,
          booking_time: directBookingModal.time,
          course_name: course?.name || "",
          course_duration: course?.duration || "30分",
          staff_name: staff?.name || "",
          status: "confirmed",
          notes: f.notes || "",
          booking_number: num,
          source: "direct",
        }),
      });
      if (!bookingRes.ok) {
        const err = await bookingRes.json();
        alert("予約の登録に失敗しました。\n" + JSON.stringify(err));
        setIsSavingDirectBooking(false);
        return;
      }
      if (customerId) {
        await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
          method: "POST", headers,
          body: JSON.stringify({
            customer_id: customerId,
            store_id: currentStore.id,
            title: "ご予約確定のお知らせ",
            body: bookingDate + " " + directBookingModal.time + " " + (course?.name || "") + "（" + (staff?.name || "") + "）",
            is_read: false,
            sent_via: "system",
          }),
        });
      }
    }
    setIsSavingDirectBooking(false);
    setDirectBookingModal(null);
    setDirectBookingForm({});
    setDirectBookingMode("normal");
    setDirectBookingProducts([{ name: "", price: "", quantity: 1 }]);
    setCustomerSearchResult(null);
    setCustomerSearchQuery("");
    const savedDateStr = formatDate(savedDate);
    fetchAll(savedDate);
    fetchTodayBookings(savedDateStr);
    fetchCompletedBookings(savedDateStr);
  };

  const searchGiftCustomer = async (query) => {
    if (!query) { setGiftCustomerResult(null); return; }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?or=(name.ilike.*${query}*,tel.ilike.*${query}*)&select=id,name,tel,email,notification_method,line_user_id&limit=5`, { headers });    setGiftCustomerResult(Array.isArray(data) ? data : []);
  };

  const issueGiftTickets = async () => {
    if (!giftSelectedCustomer || !giftForm.templateId) return;
    setGiftSaving(true);
    try {
      const template = giftTicketTemplates.find(t => t.id === giftForm.templateId);
      if (!template) return;
      const count = giftModal.mode === 'sell' ? (template.ticket_count || 10) : 1;
      const today = new Date();
      const expires = new Date(today);
      expires.setFullYear(expires.getFullYear() + 1);
      const groupId = crypto.randomUUID();
      for (let i = 0; i < count; i++) {
        await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets`, {
          method: "POST", headers,
          body: JSON.stringify({
            store_id: currentStore.id,
            customer_id: giftSelectedCustomer.id,
            ticket_type: giftModal.mode === 'sell' ? 'purchase' : 'present',
            purchase_group_id: groupId,
            ticket_name: template.name,
            face_value: template.face_value,
            issued_at: formatDate(today),
            expires_at: formatDate(expires),
            status: 'active',
          }),
        });
      }
      setGiftDone(true);
      setTimeout(() => { setGiftModal(null); setGiftDone(false); setGiftSelectedCustomer(null); setGiftForm({}); setGiftCustomerSearch(""); setGiftCustomerResult(null); }, 2000);
    } catch(e) {
      alert("発行エラーが発生しました");
    } finally {
      setGiftSaving(false);
    }
  };

  const useGiftTicketByCount = async (customerId) => {
    const today = formatDate(new Date());
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gift_tickets?customer_id=eq.${customerId}&status=eq.active&expires_at=gte.${today}&order=expires_at.asc&limit=1`,
      { headers }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets?id=eq.${data[0].id}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ status: "used", used_at: new Date().toISOString() }),
      });
      return data[0];
    }
    return null;
  };

  const fetchCustomerTicketCount = async (customerId) => {
    if (!customerId) return;
    const today = formatDate(new Date());
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gift_tickets?customer_id=eq.${customerId}&status=eq.active&expires_at=gte.${today}&order=expires_at.asc`,
      { headers }
    );
    const data = await res.json();
    setCustomerTickets(Array.isArray(data) ? data : []);
  };

  const fetchAdminNotifications = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_notifications?store_id=eq.${currentStore.id}&order=created_at.desc&limit=50`, { headers });
    const data = await res.json();
    if (Array.isArray(data)) {
      setAdminNotifications(data);
      setUnreadAdminCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAdminNotifRead = async () => {
    await fetch(`${SUPABASE_URL}/rest/v1/admin_notifications?store_id=eq.${currentStore.id}&is_read=eq.false`, {
      method: "PATCH", headers, body: JSON.stringify({ is_read: true }),
    });
    setUnreadAdminCount(0);
    setAdminNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const fetchLineMessages = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/line_messages?order=created_at.desc&select=*,customers(name,customer_number)&limit=200`, { headers });
    const data = await res.json();
    if (Array.isArray(data)) {
      setLineMessages(data);
      const unread = data.filter(m => m.direction === "inbound" && !m.is_read).length;
      setUnreadLineCount(unread);
    }
  };

  const sendLineReply = async () => {
    if (!selectedLineUser || !lineReplyText) return;
    await fetch("/api/send-line", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: selectedLineUser.line_user_id,
        messages: [{ type: "text", text: lineReplyText }],
      }),
    });
    await fetch(`${SUPABASE_URL}/rest/v1/line_messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        line_user_id: selectedLineUser.line_user_id,
        customer_id: selectedLineUser.customer_id,
        direction: "outbound",
        message: lineReplyText,
        is_read: true,
      }),
    });
    setLineReplyText("");
    fetchLineMessages();
  };

  const markLineRead = async (lineUserId) => {
    await fetch(`${SUPABASE_URL}/rest/v1/line_messages?line_user_id=eq.${lineUserId}&direction=eq.inbound&is_read=eq.false`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ is_read: true }),
    });
    fetchLineMessages();
  };

  const fetchGiftHistory = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets?store_id=eq.${currentStore.id}&order=issued_at.desc&select=*,customers(name,customer_number)`, { headers });
    const data = await res.json();
    setGiftHistory(Array.isArray(data) ? data : []);
  };
  const fetchNotifications = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/notifications?store_id=eq.${currentStore.id}&order=created_at.desc&limit=50`, { headers });
    const data = await res.json();
    setNotifications(Array.isArray(data) ? data : []);
  };

  const sendNotification = async () => {
    if (!notifyTitle || !notifyBody) return;
    setNotifySending(true);
    try {
      // 対象顧客を取得
      let targetCustomers = [];
      if (notifyTarget === "all") {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?select=id,name,email,notification_method`, { headers });
        targetCustomers = await res.json();
      } else if (notifyTarget === "individual" && notifyCustomerId) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${notifyCustomerId}&select=id,name,email,notification_method,line_user_id`, { headers });
        targetCustomers = await res.json();
      }

      for (const customer of targetCustomers) {
        // notificationsテーブルに保存
        await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
          method: "POST", headers,
          body: JSON.stringify({
            store_id: currentStore.id,
            customer_id: customer.id,
            title: notifyTitle,
            body: notifyBody,
            is_read: false,
            sent_via: customer.notification_method || "email",
          }),
        });
        // LINE送信
        console.log("customer:", customer.notification_method, customer.line_user_id);
        if (customer.notification_method === "line") {
          const lineUserId = customer.line_user_id;
          console.log("lineUserId:", lineUserId);
          if (lineUserId) {
            await fetch("/api/send-line", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: lineUserId,
                messages: [{ type: "text", text: `【${notifyTitle}】\n\n${notifyBody}` }],
              }),
            });
          }
        }
        // メール送信
        if (customer.notification_method === "email" && customer.email) {
          await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: customer.email,
              subject: notifyTitle,
              html: `<div style='font-family:sans-serif;padding:20px;'><h2>${notifyTitle}</h2><p>${notifyBody.replace(/\n/g, '<br>')}</p></div>`,
            }),
          });
        }

      }
      setNotifySent(true);
      setNotifyTitle("");
      setNotifyBody("");
      setNotifyCustomerId("");
      setNotifyCustomerResult(null);
      setNotifyCustomerSearch("");
      await fetchNotifications();
      setTimeout(() => setNotifySent(false), 3000);
    } catch(e) {
      alert("送信エラーが発生しました");
    } finally {
      setNotifySending(false);
    }
  };

  const searchNotifyCustomer = async (query) => {
    if (!query) { setNotifyCustomerResult(null); return; }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?or=(name.ilike.*${query}*,tel.ilike.*${query}*)&select=id,name,tel,email&limit=5`, { headers });
    const data = await res.json();
    setNotifyCustomerResult(Array.isArray(data) ? data : []);
  };

  const fetchMonthCalendarData = async (month) => {
    const year = month.getFullYear();
    const m = String(month.getMonth()+1).padStart(2,"0");
    const from = `${year}-${m}-01`;
    const lastDay = new Date(year, month.getMonth()+1, 0).getDate();
    const to = `${year}-${m}-${String(lastDay).padStart(2,"0")}`;
    // 予約がある日を取得
    const bRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?store_id=eq.${currentStore.id}&booking_date=gte.${from}&booking_date=lte.${to}&status=in.(confirmed,received,treatment_done)&select=booking_date`, { headers });
    const bData = await bRes.json();
    setMonthBookingDates(new Set(Array.isArray(bData) ? bData.map(b => b.booking_date) : []));
    // シフトがある日を取得
    const sRes = await fetch(`${SUPABASE_URL}/rest/v1/shifts?store_id=eq.${currentStore.id}&work_date=gte.${from}&work_date=lte.${to}&select=work_date`, { headers });
    const sData = await sRes.json();
    const shiftDates = new Set(Array.isArray(sData) ? sData.map(s => s.work_date) : []);
    // シフトがない日をグレーアウト対象に
    const offDates = new Set();
    for (let i = 1; i <= lastDay; i++) {
      const dateStr = `${year}-${m}-${String(i).padStart(2,"0")}`;
      if (!shiftDates.has(dateStr)) offDates.add(dateStr);
    }
    setMonthShiftOffDates(offDates);
  };
  const fetchAll = async (date) => {
    await Promise.all([fetchBookings(date), fetchBlocks(date), fetchShifts(date), fetchExtensions(date)]);
  };
  const fetchAllSilent = async (date) => {
    await Promise.all([fetchBookings(date, true), fetchBlocks(date), fetchShifts(date), fetchExtensions(date)]);
  };

  useEffect(() => {
    if (loggedIn && tab === "customers") { fetchCustomers(); fetchAllCustomerTickets(); }
    if (loggedIn && tab === "shifts") { fetchMonthShifts(); fetchShiftPlans(); fetchStaffMembers(); }
    if (loggedIn && tab === "checkout") { fetchTodayBookings(); fetchCompletedBookings(); fetchProducts(); fetchCourseMenus(); fetchSubMenus(); fetchGiftTicketTemplates(); }
    if (loggedIn && tab === "settings") { fetchStaffMembers(); fetchCourseMenus(); fetchProducts(); fetchSubMenus(); fetchStoreSettings(); fetchGiftTicketTemplates(); }
    if (loggedIn && tab === "calendar") { fetchStaffMembers(); if (selectedDate) fetchAll(selectedDate); }
    if (loggedIn && tab === "checkin") { fetchTodayReceived(); }
    if (loggedIn && tab === "bookings") { fetchBookings(selectedDate || new Date()); }
    if (loggedIn && tab === "notifications") { fetchNotifications(); fetchCustomers(); }
    if (loggedIn && tab === "gifts") { fetchGiftTicketTemplates(); fetchGiftHistory(); }
  if (loggedIn && tab === "messages") { fetchLineMessages(); }
  if (loggedIn && tab === "report") { fetchDailyReport(reportDate); }
  if (loggedIn && tab === "monthlyreport") { fetchStoreSettings(); fetchMonthlyReport(monthlyReportMonth); }
  if (loggedIn) { fetchAdminNotifications(); }
  }, [loggedIn, tab]);

  useEffect(() => {
    if (loggedIn && selectedDate) fetchAll(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
        if (loggedIn && currentStore && tab === "calendar") fetchMonthCalendarData(currentMonth);
  }, [currentMonth, loggedIn, currentStore, tab]);

  useEffect(() => {
    if (!loggedIn || !currentStore) return;
    const interval = setInterval(() => {
      if (tab === "calendar" && selectedDate) fetchAll(selectedDate);
      if (tab === "checkin") fetchTodayReceived();
      if (tab === "bookings") fetchBookings(selectedDate || new Date());
      fetchAdminNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, [loggedIn, currentStore, tab, selectedDate]);
  useEffect(() => {
    if (loggedIn && tab === "shifts") fetchMonthShifts();
  }, [shiftMonth]);

  useEffect(() => {
    const handleClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setPopover(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const saveStaff = async () => {
    if (!editingStaff?.name) return;
    if (editingStaff.id) {
      await fetch(`${SUPABASE_URL}/rest/v1/staff_members?id=eq.${editingStaff.id}`, { method: "PATCH", headers, body: JSON.stringify({ name: editingStaff.name, title: editingStaff.title, specialty: editingStaff.specialty, is_active: editingStaff.is_active }) });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/staff_members`, { method: "POST", headers, body: JSON.stringify({ store_id: currentStore.id, name: editingStaff.name, title: editingStaff.title, specialty: editingStaff.specialty, is_active: true, sort_order: staffMembers.length + 1 }) });
    }
    await fetchStaffMembers();
    setEditingStaff(null);
  };

  const deleteStaff = async (id) => {
    await fetch(`${SUPABASE_URL}/rest/v1/staff_members?id=eq.${id}`, { method: "DELETE", headers });
    await fetchStaffMembers();
  };

  const saveCourse = async () => {
    if (!editingCourse?.name) return;
    if (editingCourse.id) {
      await fetch(`${SUPABASE_URL}/rest/v1/course_menus?id=eq.${editingCourse.id}`, { method: "PATCH", headers, body: JSON.stringify({ name: editingCourse.name, duration: editingCourse.duration, price: parseInt(editingCourse.price), description: editingCourse.description, is_active: editingCourse.is_active, is_first_only: editingCourse.is_first_only, category: editingCourse.category || "整体" }) });    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/course_menus`, { method: "POST", headers, body: JSON.stringify({ name: editingCourse.name, duration: editingCourse.duration, price: parseInt(editingCourse.price), description: editingCourse.description, is_active: true, is_first_only: editingCourse.is_first_only || false, sort_order: courseMenus.length + 1, category: editingCourse.category || "整体" }) });    }
    await fetchCourseMenus();
    setEditingCourse(null);
  };

  const deleteCourse = async (id) => {
    await fetch(`${SUPABASE_URL}/rest/v1/course_menus?id=eq.${id}`, { method: "DELETE", headers });
    await fetchCourseMenus();
  };

  const saveProduct = async () => {
    if (!editingProduct?.name) return;
    if (editingProduct.id) {
      await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${editingProduct.id}`, { method: "PATCH", headers, body: JSON.stringify({ name: editingProduct.name, price: parseInt(editingProduct.price), category: editingProduct.category, is_active: editingProduct.is_active }) });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/products`, { method: "POST", headers, body: JSON.stringify({ store_id: currentStore.id, name: editingProduct.name, price: parseInt(editingProduct.price), category: editingProduct.category, is_active: true, sort_order: products.length + 1 }) });
    }
    await fetchProducts();
    setEditingProduct(null);
  };

  const deleteProduct = async (id) => {
    await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, { method: "DELETE", headers });
    await fetchProducts();
  };

  const saveSubMenu = async () => {
    if (!editingSubMenu?.name) {
      alert("サブメニュー名を入力してください");
      return;
    }
    try {
      let res;
      if (editingSubMenu.id) {
        res = await fetch(`${SUPABASE_URL}/rest/v1/sub_menus?id=eq.${editingSubMenu.id}`, { method: "PATCH", headers, body: JSON.stringify({ name: editingSubMenu.name, price: parseInt(editingSubMenu.price) || 0, is_active: editingSubMenu.is_active !== false }) });
      } else {
        const body = { store_id: String(currentStore.id), name: editingSubMenu.name, price: parseInt(editingSubMenu.price) || 0, is_active: true, sort_order: subMenus.length + 1 };
        console.log("[saveSubMenu] POST body:", body);
        res = await fetch(`${SUPABASE_URL}/rest/v1/sub_menus`, { method: "POST", headers, body: JSON.stringify(body) });
      }
      if (!res.ok) {
        const errText = await res.text();
        console.error("[saveSubMenu] エラー:", res.status, errText);
        alert(`保存失敗 (${res.status})\n${errText}\n\n※sub_menusテーブルが存在しない場合はSupabaseで作成してください`);
        return;
      }
      await fetchSubMenus();
      setEditingSubMenu(null);
    } catch (e) {
      console.error("[saveSubMenu] 例外:", e);
      alert(`保存中にエラーが発生しました\n${e.message}`);
    }
  };

  const deleteSubMenu = async (id) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sub_menus?id=eq.${id}`, { method: "DELETE", headers });
    if (!res.ok) {
      const errText = await res.text();
      alert(`削除失敗 (${res.status})\n${errText}`);
      return;
    }
    await fetchSubMenus();
  };

  const startCheckout = (booking) => {
    const course = courseMenus.find(c => c.id === booking.course_id) || { name: booking.course_name, price: 0 };
    setCheckoutBooking(booking);
    setCheckoutDiscount(0);
    setCheckoutPaymentMethods([{ method: "cash", amount: 0 }]);
    setCheckoutTicketUse({ purchase: 0, present: 0 });
    setCheckoutNote("");
    setCheckoutComplete(false);
    setCheckoutResult(null);
    setSelectedTicket(null);
    setCustomerTickets([]);
    setConnectedBooking(null);
    setIncludeConnectedBooking(false);
    if (booking.customer_id) fetchCustomerTicketCount(booking.customer_id);
    // 物販のみ予約は既存の payment_items を読み込んで商品名を復元する
    if (!booking.course_id && booking.course_name === "物販") {
      fetch(`${SUPABASE_URL}/rest/v1/payments?booking_id=eq.${booking.id}&order=created_at.desc&limit=1`, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
      }).then(r => r.json()).then(payData => {
        if (payData && payData[0]) {
          fetch(`${SUPABASE_URL}/rest/v1/payment_items?payment_id=eq.${payData[0].id}`, {
            headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
          }).then(r => r.json()).then(items => {
            setCheckoutItems(Array.isArray(items) && items.length > 0
              ? items.map(i => ({ type: i.item_type || "product", name: i.item_name, price: i.price, quantity: i.quantity }))
              : []
            );
          });
        } else {
          setCheckoutItems([]);
        }
      });
    } else {
      setCheckoutItems([{ type: "course", name: course.name, price: course.price || 0, quantity: 1 }]);
    }
    if (booking.connected_booking_id && booking.status !== "completed") {
      fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking.connected_booking_id}&select=*,customers(name)`, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
      }).then(r => r.json()).then(data => {
        if (data && data[0] && data[0].status !== "completed") {
          setConnectedBooking(data[0]);
        }
      });
    }
  };

  const addProduct = (product) => {
    const existing = checkoutItems.find(i => i.id === product.id);
    if (existing) {
      setCheckoutItems(checkoutItems.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCheckoutItems([...checkoutItems, { id: product.id, type: "product", name: product.name, price: product.price, quantity: 1 }]);
    }
  };

  const addSubMenu = (subMenu) => {
    const itemId = "sub_" + subMenu.id;
    const existing = checkoutItems.find(i => i.id === itemId);
    if (existing) {
      setCheckoutItems(checkoutItems.map(i => i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCheckoutItems([...checkoutItems, { id: itemId, type: "submenu", name: subMenu.name, price: subMenu.price, quantity: 1 }]);
    }
  };

  const removeItem = (index) => setCheckoutItems(checkoutItems.filter((_, i) => i !== index));

  const updateQuantity = (index, qty) => {
    if (qty <= 0) { removeItem(index); return; }
    setCheckoutItems(checkoutItems.map((item, i) => i === index ? { ...item, quantity: qty } : item));
  };

  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal - checkoutDiscount);

  const savePayment = async () => {
    const paymentRes = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
      method: "POST", headers,
      body: JSON.stringify({ store_id: currentStore.id, customer_id: checkoutBooking?.customer_id || null, booking_id: checkoutBooking?.id || null, subtotal, discount: checkoutDiscount, discount_reason: checkoutDiscountReason, total, payment_method: checkoutPaymentMethods.map(p => p.method).join(","), payment_status: "paid", notes: checkoutNote }),
    });
    const paymentData = await paymentRes.json();
    const paymentId = paymentData[0]?.id;
    if (paymentId) {
      for (const item of checkoutItems) {
        await fetch(`${SUPABASE_URL}/rest/v1/payment_items`, { method: "POST", headers, body: JSON.stringify({ payment_id: paymentId, item_type: item.type, item_name: item.name, price: item.price, quantity: item.quantity }) });
      }
      for (const pm of checkoutPaymentMethods) {
        if (pm.amount > 0) {
          await fetch(`${SUPABASE_URL}/rest/v1/payment_methods`, { method: "POST", headers, body: JSON.stringify({ payment_id: paymentId, method: pm.method, amount: pm.amount }) });
        }
      }
    }
    if (checkoutBooking) {
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${checkoutBooking.id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "completed", completed_at: new Date().toISOString() }) });
      if (includeConnectedBooking && connectedBooking) {
        await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${connectedBooking.id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "completed", completed_at: new Date().toISOString() }) });
      }
      // ポイント加算
      if (checkoutBooking.customer_id) {
        const ptRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${checkoutBooking.customer_id}&select=points`, { headers });
        const ptData = await ptRes.json();
        const currentPoints = ptData[0]?.points || 0;
        const newPoints = currentPoints + 1;
        await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${checkoutBooking.customer_id}`, {
          method: "PATCH", headers,
          body: JSON.stringify({ points: newPoints }),
        });
        // 20P到達で1000円金券自動発行
        if (newPoints % 20 === 0) {
          const tplRes = await fetch(`${SUPABASE_URL}/rest/v1/gift_ticket_templates?store_id=eq.${currentStore.id}&limit=1`, { headers });
          const tplData = await tplRes.json();
          if (tplData && tplData[0]) {
            const tpl = tplData[0];
            await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets`, {
              method: "POST", headers,
              body: JSON.stringify({ customer_id: checkoutBooking.customer_id, store_id: currentStore.id, template_id: tpl.id, code: "PT" + Date.now(), amount: 1000, remaining: 1000, status: "active", issued_at: new Date().toISOString(), note: "ポイント20P達成特典" }),
            });
          }
        }
      }
    }
    setCheckoutResult({ paymentId, total, subtotal, discount: checkoutDiscount, discountReason: checkoutDiscountReason, paymentMethod: checkoutPaymentMethods.map(p => p.method).join(","), customerName: checkoutBooking?.customers?.name || "お客様", items: checkoutItems });
    setCheckoutComplete(true);
    fetchTodayBookings();
    fetchCompletedBookings();
  };

  const saveShift = async (staffId, date, startTime, endTime, type) => {
    const existing = monthShifts.find(s => s.staff_id === staffId && s.work_date === date);
    const existingClosed = monthShifts.find(s => s.staff_id === "closed" && s.work_date === date);
    if (type === "休み") {
      if (existing) await fetch(`${SUPABASE_URL}/rest/v1/shifts?id=eq.${existing.id}`, { method: "DELETE", headers });
    } else if (type === "休院") {
      if (!existingClosed) await fetch(`${SUPABASE_URL}/rest/v1/shifts`, { method: "POST", headers, body: JSON.stringify({ store_id: currentStore.id, staff_id: "closed", work_date: date, start_time: "00:00", end_time: "00:00" }) });
    } else if (type === "休院解除") {
      if (existingClosed) await fetch(`${SUPABASE_URL}/rest/v1/shifts?id=eq.${existingClosed.id}`, { method: "DELETE", headers });
    } else {
      if (existing) {
        await fetch(`${SUPABASE_URL}/rest/v1/shifts?id=eq.${existing.id}`, { method: "PATCH", headers, body: JSON.stringify({ start_time: startTime, end_time: endTime }) });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/shifts`, { method: "POST", headers, body: JSON.stringify({ store_id: currentStore.id, staff_id: staffId, work_date: date, start_time: startTime, end_time: endTime }) });
      }
    }
    await fetchMonthShifts();
  };

  const savePlan = async () => {
    if (!newPlanName.trim()) return;
    const planData = editingPlan?.plan_data || {};
    if (editingPlan?.id) {
      await fetch(`${SUPABASE_URL}/rest/v1/shift_plans?id=eq.${editingPlan.id}`, { method: "PATCH", headers, body: JSON.stringify({ plan_name: newPlanName, plan_data: planData }) });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/shift_plans`, { method: "POST", headers, body: JSON.stringify({ store_id: currentStore.id, plan_name: newPlanName, plan_data: planData }) });
    }
    await fetchShiftPlans();
    setEditingPlan(null);
    setNewPlanName("");
  };

  const deletePlan = async (id) => {
    await fetch(`${SUPABASE_URL}/rest/v1/shift_plans?id=eq.${id}`, { method: "DELETE", headers });
    await fetchShiftPlans();
  };

  const applyPlan = async (plan, startDate, endDate) => {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    const planData = plan.plan_data || {};
    const d = new Date(start);
    while (d <= end) {
      const dayOfWeek = d.getDay();
      const dateStr = formatDate(d);
      for (const staffId of Object.keys(planData)) {
        const dayData = planData[staffId]?.[dayOfWeek];
        if (dayData?.enabled) await saveShift(staffId, dateStr, dayData.start || "10:00", dayData.end || "19:30", "出勤");
      }
      d.setDate(d.getDate() + 1);
    }
    setApplyPlanModal(null);
    await fetchMonthShifts();
  };

  const updatePlanData = (staffId, dayOfWeek, field, value) => {
    const current = editingPlan?.plan_data || {};
    const staffData = current[staffId] || {};
    const dayData = staffData[dayOfWeek] || {};
    setEditingPlan({ ...editingPlan, plan_data: { ...current, [staffId]: { ...staffData, [dayOfWeek]: { ...dayData, [field]: value } } } });
  };

  const getShiftForCell = (staffId, date) => monthShifts.find(s => s.staff_id === staffId && s.work_date === date);
  const isClosedDay = (date) => monthShifts.some(s => s.staff_id === "closed" && s.work_date === date);

  const getDaysInMonth = (month) => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1).getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, m, i));
    return days;
  };

  const toggleExtension = async (type) => {
    const d = formatDate(selectedDate);
    const ext = extensions[0];
    if (ext) {
      await fetch(`${SUPABASE_URL}/rest/v1/time_extensions?id=eq.${ext.id}`, { method: "PATCH", headers, body: JSON.stringify({ [type]: !ext[type] }) });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/time_extensions`, { method: "POST", headers, body: JSON.stringify({ store_id: currentStore.id, extension_date: d, [type]: true }) });
    }
    fetchExtensions(selectedDate);
  };

  const updateBookingStatus = async (id, status) => {
    const now = new Date().toISOString();
    const timestampField = {
      confirmed: "confirmed_at",
      received: "received_at",
      treatment_done: "treatment_done_at",
      cancelled: "cancelled_at",
      completed: "completed_at",
    }[status];
    const updateData = { status };
    if (timestampField) updateData[timestampField] = now;
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify(updateData) });
    fetchMonthCalendarData(currentMonth);
    
    // 受付時に顧客番号を付番
    if (status === 'received') {
      const booking = bookings.find(b => b.id === id);
      if (booking?.customer_id) {
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/assign_customer_number`, {
          method: "POST", headers,
          body: JSON.stringify({
            p_customer_id: booking.customer_id,
            p_store_id: currentStore.id
          }),
        });
      }
    }
    // キャンセル時にマイページ通知
    if (status === "cancelled") {
      const booking = bookings.find(b => b.id === id);
      if (booking?.customer_id) {
        await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
          method: "POST", headers,
          body: JSON.stringify({
            customer_id: booking.customer_id,
            store_id: currentStore.id,
            title: "予約キャンセルのお知らせ",
            body: booking.booking_date + " " + booking.booking_time + " " + booking.course_name + "のご予約がキャンセルされました。",
            is_read: false,
            sent_via: "system",
          }),
        });
      }
    }
    fetchBookings(selectedDate);
    if (selectedBooking?.id === id) setSelectedBooking({ ...selectedBooking, status });
  };

  const statusLabel = (s) => ({ confirmed: "確認済", received: "受付", treatment_done: "施術終了", cancelled: "キャンセル", completed: "会計済", pending: "未確認" }[s] || s);
  const statusColor = (s) => ({ confirmed: "#5a9e7a", received: "#7090e0", treatment_done: "#e0a040", cancelled: "#e07070", completed: "#aaa", pending: "#ccc" }[s] || "#aaa");

  const getTimeSlots = () => {
    const ext = extensions[0] || {};
    const slots = [];
    if (ext.morning_0900) slots.push("09:00");
    if (ext.morning_0930) slots.push("09:30");
    slots.push(...BASE_SLOTS);
    if (ext.evening_2000) slots.push("20:00");
    if (ext.evening_2030) slots.push("20:30");
    return slots;
  };

  const isSlotExtended = (time) => {
    const ext = extensions[0] || {};
    if (time === "09:00") return ext.morning_0900 || false;
    if (time === "09:30") return ext.morning_0930 || false;
    if (time === "20:00") return ext.evening_2000 || false;
    if (time === "20:30") return ext.evening_2030 || false;
    return false;
  };

  const toggleSlot = async (time) => {
    const d = formatDate(selectedDate);
    const ext = extensions[0];
    const fieldMap = { "09:00": "morning_0900", "09:30": "morning_0930", "20:00": "evening_2000", "20:30": "evening_2030" };
    const field = fieldMap[time];
    const currentVal = ext?.[field] || false;
    if (ext) {
      await fetch(`${SUPABASE_URL}/rest/v1/time_extensions?id=eq.${ext.id}`, { method: "PATCH", headers, body: JSON.stringify({ [field]: !currentVal }) });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/time_extensions`, { method: "POST", headers, body: JSON.stringify({ store_id: currentStore.id, extension_date: d, [field]: true }) });
    }
    fetchExtensions(selectedDate);
  };

  const isSlotBreakReleased = (time) => {
    const ext = extensions[0] || {};
    if (time === "13:30") return ext.break_released_1330 || false;
    if (time === "14:00") return ext.break_released_1400 || false;
    if (time === "14:30") return ext.break_released_1430 || false;
    return false;
  };

  const toggleBreakSlot = async (time) => {
    const d = formatDate(selectedDate);
    const ext = extensions[0];
    const field = time === "13:30" ? "break_released_1330" : time === "14:00" ? "break_released_1400" : "break_released_1430";
    const currentVal = ext?.[field] || false;
    // 閉じようとしている場合、予約があればブロック
    if (currentVal) {
      const hasBooking = bookings.some(b => b.booking_time === time && b.status !== "cancelled");
      if (hasBooking) {
        alert(`${time}に予約が入っているため、閉じることができません。`);
        return;
      }
    }
    if (ext) {
      await fetch(`${SUPABASE_URL}/rest/v1/time_extensions?id=eq.${ext.id}`, { method: "PATCH", headers, body: JSON.stringify({ [field]: !currentVal }) });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/time_extensions`, { method: "POST", headers, body: JSON.stringify({ store_id: currentStore.id, extension_date: d, [field]: true }) });
    }
    fetchExtensions(selectedDate);
  };

  const getBookingForCell = (staffId, time) => bookings.find(b => b.staff_id === staffId && b.booking_time === time && b.status !== "cancelled");
  const isBlocked = (staffId, time) => blocks.some(b => (b.staff_id === staffId || b.staff_id === "all") && (b.block_time === time || b.block_time === time + ":00"));
  const getBlock = (staffId, time) => blocks.find(b => (b.staff_id === staffId || b.staff_id === "all") && (b.block_time === time || b.block_time === time + ":00"));
  const isOnShift = (staffId) => { if (shifts.length === 0) return false; return shifts.some(s => s.staff_id === staffId); };
  const staffList = staffMembers.filter(s => s.is_active);

  const ShiftPopover = ({ staffId, staffName, date, shift, closed }) => {
    const [startTime, setStartTime] = useState(shift?.start_time?.slice(0,5) || "10:00");
    const [endTime, setEndTime] = useState(shift?.end_time?.slice(0,5) || "19:30");
    const [showTime, setShowTime] = useState(!!shift);
    return (
      <div ref={popoverRef} style={{ position: "absolute", zIndex: 100, background: "white", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", padding: 16, minWidth: 220, position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 200 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>{staffName} / {date}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => setShowTime(true)} style={{ padding: "8px 12px", borderRadius: 8, border: `2px solid ${showTime ? "#5a9e7a" : "#e8ddd0"}`, background: showTime ? "#eaf5ec" : "white", color: showTime ? "#3a5a3a" : "#888", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>〇 出勤</button>
          {showTime && (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ flex: 1, padding: "6px 8px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 12 }} />
                <span style={{ color: "#aaa", fontSize: 12 }}>〜</span>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ flex: 1, padding: "6px 8px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 12 }} />
              </div>
              <button onClick={async () => { await saveShift(staffId, date, startTime, endTime, "出勤"); setPopover(null); }} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>保存</button>
            </>
          )}
          <button onClick={async () => { await saveShift(staffId, date, "", "", "休み"); setPopover(null); }} style={{ padding: "8px 12px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>　 休み</button>
        </div>
      </div>
    );
  };

  const ClosedPopover = ({ date, closed }) => (
    <div ref={popoverRef} style={{ position: "absolute", zIndex: 100, background: "white", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", padding: 16, minWidth: 180, top: "100%", left: 0 }} onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>休院日設定 / {date}</div>
      {closed ? (
        <button onClick={async () => { await saveShift("closed", date, "", "", "休院解除"); setPopover(null); }} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "2px solid #e07070", background: "white", color: "#e07070", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>休院を解除する</button>
      ) : (
        <button onClick={async () => { await saveShift("closed", date, "", "", "休院"); setPopover(null); }} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "2px solid #e0a040", background: "#fdf5f0", color: "#e0a040", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>ー 休院日に設定する</button>
      )}
    </div>
  );

  if (!loggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #fdf9f4 0%, #f5ede0 50%, #edf5f0 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Sans JP', sans-serif" }}>
        <div style={{ background: "white", borderRadius: 20, padding: 40, width: 360, boxShadow: "0 8px 40px rgba(0,0,0,0.1)" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#3a5a3a" }}>管理画面</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>整体院 癒楽里</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>店舗</label>
            <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: "#3a5a3a", background: "white", boxSizing: "border-box" }}>
              {STORES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>パスワード</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="パスワードを入力" style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: "#3a5a3a", background: "white", boxSizing: "border-box", outline: "none" }} />
          </div>
          {error && <div style={{ color: "#e07070", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</div>}
          <button onClick={handleLogin} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>ログイン</button>
        </div>
      </div>
    );
  }

  const timeSlots = getTimeSlots();
  const ext = extensions[0] || {};

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "'Noto Sans JP', sans-serif" }}>

      {directBookingModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => { setDirectBookingModal(null); setDirectBookingMode("normal"); setDirectBookingProducts([{ name: "", price: "", quantity: 1 }]); }}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>📝 直接予約入力</div>
              <button onClick={() => { setDirectBookingModal(null); setDirectBookingMode("normal"); setDirectBookingProducts([{ name: "", price: "", quantity: 1 }]); }} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#aaa" }}>×</button>
            </div>
            {/* タブ切替 */}
            <div style={{ display: "flex", background: "#f0ebe4", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
              {[{ key: "normal", label: "通常予約" }, { key: "product", label: "物販のみ" }].map(tab => (
                <button key={tab.key} onClick={() => setDirectBookingMode(tab.key)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: directBookingMode === tab.key ? "white" : "transparent", color: directBookingMode === tab.key ? "#3a5a3a" : "#999", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: directBookingMode === tab.key ? "0 2px 8px rgba(0,0,0,0.1)" : "none" }}>{tab.label}</button>
              ))}
            </div>
            <div style={{ background: "#f9f6f2", borderRadius: 12, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: "#7a9a7a" }}>
              📅 {directBookingModal.date.getMonth()+1}月{directBookingModal.date.getDate()}日　⏰ {directBookingModal.time}　👤 {staffMembers.find(s => s.id === directBookingModal.staffId)?.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* 共通：顧客検索 */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>顧客番号または氏名で検索</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="text" value={customerSearchQuery} onChange={e => setCustomerSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && searchCustomerByNumber(customerSearchQuery)} placeholder="例：1001 または 田中" style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
                  <button onClick={() => searchCustomerByNumber(customerSearchQuery)} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>検索</button>
                </div>
                {customerSearchResults.length > 1 && (
                  <div style={{ marginTop: 8, background: "white", borderRadius: 10, border: "2px solid #e8ddd0", overflow: "hidden" }}>
                    {customerSearchResults.map(c => (
                      <div key={c.id} onClick={() => { setCustomerSearchResult(c); setDirectBookingForm(f => ({ ...f, customer_id: c.id, customer_name: c.name, customer_kana: c.kana || "", tel: c.tel || "" })); setCustomerSearchResults([]); }}
                        style={{ padding: "10px 14px", borderBottom: "1px solid #f0e8d8", fontSize: 13, color: "#3a5a3a", cursor: "pointer" }}>
                        {c.name}（{c.kana}）{c.tel}
                      </div>
                    ))}
                  </div>
                )}
                {customerSearchResults.length === 1 && customerSearchResult && <div style={{ marginTop: 8, padding: "10px 14px", background: "#eaf5ec", borderRadius: 10, fontSize: 13, color: "#3a5a3a" }}>✓ {customerSearchResult.name}（{customerSearchResult.kana}）{customerSearchResult.tel}</div>}
                {customerSearchQuery && !customerSearchResult && <div style={{ marginTop: 8, fontSize: 12, color: "#e0a040" }}>該当なし → 下に手入力すると新規顧客として登録されます</div>}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>お名前 <span style={{ color: "#e07070" }}>*</span></label>
                <input value={directBookingForm.customer_name || ""} onChange={e => setDirectBookingForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="山田 花子" style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>フリガナ</label>
                <input value={directBookingForm.customer_kana || ""} onChange={e => setDirectBookingForm(f => ({ ...f, customer_kana: e.target.value }))} placeholder="ヤマダ ハナコ" style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>電話番号</label>
                <input value={directBookingForm.tel || ""} onChange={e => setDirectBookingForm(f => ({ ...f, tel: e.target.value.replace(/[^0-9-]/g, "") }))} placeholder="090-1234-5678" inputMode="tel" style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              {/* 通常予約のみ: コース選択 */}
              {directBookingMode === "normal" && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>コース <span style={{ color: "#e07070" }}>*</span></label>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    {["整体", "エステ"].map(cat => (
                      <button key={cat} onClick={() => { setDirectBookingCategory(cat); setDirectBookingFirstOnly(""); setDirectBookingForm(f => ({ ...f, course_id: "" })); }}
                        style={{ flex: 1, padding: "8px", borderRadius: 10, border: `2px solid ${directBookingCategory === cat ? "#5a9e7a" : "#e8ddd0"}`, background: directBookingCategory === cat ? "#eaf5ec" : "white", color: directBookingCategory === cat ? "#3a5a3a" : "#888", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        {cat}
                      </button>
                    ))}
                  </div>
                  {directBookingCategory && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      {["初回", "2回目以降"].map(type => (
                        <button key={type} onClick={() => { setDirectBookingFirstOnly(type); setDirectBookingForm(f => ({ ...f, course_id: "" })); }}
                          style={{ flex: 1, padding: "8px", borderRadius: 10, border: `2px solid ${directBookingFirstOnly === type ? "#5a9e7a" : "#e8ddd0"}`, background: directBookingFirstOnly === type ? "#eaf5ec" : "white", color: directBookingFirstOnly === type ? "#3a5a3a" : "#888", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                  {directBookingCategory && directBookingFirstOnly && (
                    <select value={directBookingForm.course_id || ""} onChange={e => setDirectBookingForm(f => ({ ...f, course_id: e.target.value }))} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box", background: "white" }}>
                      <option value="">選択してください</option>
                      {courseMenus.filter(c => c.is_active && c.category === directBookingCategory && (directBookingFirstOnly === "初回" ? c.is_first_only : !c.is_first_only)).sort((a, b) => a.sort_order - b.sort_order).map(c => <option key={c.id} value={c.id}>{c.name}（{c.duration} / ¥{c.price?.toLocaleString()}）</option>)}
                    </select>
                  )}
                </div>
              )}
              {/* 物販のみ: 担当スタッフ + 商品入力 */}
              {directBookingMode === "product" && (
                <>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>担当スタッフ</label>
                    <select value={directBookingForm.staff_id || ""} onChange={e => setDirectBookingForm(f => ({ ...f, staff_id: e.target.value }))} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box", background: "white" }}>
                      <option value="">選択してください</option>
                      {staffMembers.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>商品</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {directBookingProducts.map((p, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input value={p.name} onChange={e => setDirectBookingProducts(ps => ps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="品名" style={{ flex: 3, padding: "8px 12px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 13, boxSizing: "border-box" }} />
                          <input value={p.price} onChange={e => setDirectBookingProducts(ps => ps.map((x, j) => j === i ? { ...x, price: e.target.value.replace(/[^0-9]/g, "") } : x))} placeholder="単価" inputMode="numeric" style={{ flex: 2, padding: "8px 12px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 13, boxSizing: "border-box" }} />
                          <input value={p.quantity} onChange={e => setDirectBookingProducts(ps => ps.map((x, j) => j === i ? { ...x, quantity: e.target.value.replace(/[^0-9]/g, "") || 1 } : x))} placeholder="数量" inputMode="numeric" style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 13, boxSizing: "border-box" }} />
                          {directBookingProducts.length > 1 && (
                            <button onClick={() => setDirectBookingProducts(ps => ps.filter((_, j) => j !== i))} style={{ border: "none", background: "#f5e8e8", color: "#e07070", borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>×</button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => setDirectBookingProducts(ps => [...ps, { name: "", price: "", quantity: 1 }])} style={{ padding: "8px", borderRadius: 8, border: "2px dashed #e8ddd0", background: "white", color: "#aaa", fontSize: 13, cursor: "pointer" }}>＋ 商品を追加</button>
                    </div>
                    {directBookingProducts.some(p => p.name && p.price) && (
                      <div style={{ marginTop: 10, textAlign: "right", fontSize: 14, fontWeight: 700, color: "#3a5a3a" }}>
                        合計：¥{directBookingProducts.filter(p => p.name && p.price).reduce((sum, p) => sum + Number(p.price) * Number(p.quantity || 1), 0).toLocaleString()}
                      </div>
                    )}
                  </div>
                </>
              )}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>メモ</label>
                <input value={directBookingForm.notes || ""} onChange={e => setDirectBookingForm(f => ({ ...f, notes: e.target.value }))} placeholder="施術メモ・来院理由など" style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={() => { setDirectBookingModal(null); setDirectBookingMode("normal"); setDirectBookingProducts([{ name: "", price: "", quantity: 1 }]); }} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>キャンセル</button>
              {directBookingMode === "normal" ? (
                <button onClick={saveDirectBooking} disabled={isSavingDirectBooking || !directBookingForm.customer_name || !directBookingForm.course_id} style={{ flex: 2, padding: "14px", borderRadius: 14, border: "none", background: !isSavingDirectBooking && directBookingForm.customer_name && directBookingForm.course_id ? "linear-gradient(135deg, #5a9e7a, #3a7a5a)" : "#e8ddd0", color: !isSavingDirectBooking && directBookingForm.customer_name && directBookingForm.course_id ? "white" : "#bbb", fontSize: 15, fontWeight: 700, cursor: !isSavingDirectBooking && directBookingForm.customer_name && directBookingForm.course_id ? "pointer" : "not-allowed" }}>{isSavingDirectBooking ? "登録中..." : "予約を登録する"}</button>
              ) : (
                <button onClick={saveDirectBooking} disabled={isSavingDirectBooking || !directBookingForm.customer_name || !directBookingProducts.some(p => p.name && p.price)} style={{ flex: 2, padding: "14px", borderRadius: 14, border: "none", background: !isSavingDirectBooking && directBookingForm.customer_name && directBookingProducts.some(p => p.name && p.price) ? "linear-gradient(135deg, #e07b39, #c05a20)" : "#e8ddd0", color: !isSavingDirectBooking && directBookingForm.customer_name && directBookingProducts.some(p => p.name && p.price) ? "white" : "#bbb", fontSize: 15, fontWeight: 700, cursor: !isSavingDirectBooking && directBookingForm.customer_name && directBookingProducts.some(p => p.name && p.price) ? "pointer" : "not-allowed" }}>{isSavingDirectBooking ? "登録中..." : "物販を登録する"}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedBooking && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setSelectedBooking(null)}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>予約詳細</div>
              <button onClick={() => setSelectedBooking(null)} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#aaa" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {[
                { label: "予約番号", value: selectedBooking.booking_number + "　" + new Date(selectedBooking.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) + " 予約" },
                { label: "日時", value: `${selectedBooking.booking_date} ${selectedBooking.booking_time}` },
                { label: "コース", value: selectedBooking.course_name },
                { label: "担当", value: selectedBooking.staff_name },
                { label: "お名前", value: selectedBooking.customers?.name || "未登録", isName: true },
                { label: "電話番号", value: selectedBooking.customers?.tel || "-" },
                { label: "メール", value: selectedBooking.customers?.email || "-" },
                { label: "LINE", value: selectedBooking.customers?.line_user_id ? "連携済" : "未連携" },
                { label: "メモ", value: selectedBooking.notes || "-" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", borderBottom: "1px solid #f0ebe4", paddingBottom: 8 }}>
                  <div style={{ fontSize: 12, color: "#7a9a7a", fontWeight: 700, width: 80, flexShrink: 0 }}>{row.label}</div>
                  {row.isName && selectedBooking.customer_id ? (
                    <div onClick={() => { const cid = selectedBooking.customer_id; setSelectedBooking(null); fetchCustomerHistory(cid); fetch(SUPABASE_URL + "/rest/v1/customers?id=eq." + cid + "&select=*", { headers }).then(r => r.json()).then(d => { if (d && d[0]) setSelectedCustomer(d[0]); }); }} style={{ fontSize: 13, color: "#5a9e7a", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>{row.value} →</div>
                  ) : (
                    <div style={{ fontSize: 13, color: "#3a5a3a" }}>{row.value}</div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 16, marginBottom: 4, flexWrap: "wrap" }}>
              {[
                { key: "confirmed", label: "確認済", field: "confirmed_at" },
                { key: "received", label: "受付", field: "received_at" },
                { key: "treatment_done", label: "施術終了", field: "treatment_done_at" },
                { key: "cancelled", label: "キャンセル", field: "cancelled_at" },
              ].map(s => selectedBooking[s.field] ? (
                <div key={s.key} style={{ fontSize: 10, color: "#aaa", padding: "2px 8px", background: "#f5f5f5", borderRadius: 6 }}>
                  {s.label}：{new Date(selectedBooking[s.field]).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              ) : null)}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              {["confirmed", "received", "treatment_done", "cancelled"].map(s => (
               <button key={s} onClick={async () => { await updateBookingStatus(selectedBooking.id, s); if (s === "received" && selectedBooking.customer_id) { const r = await fetch(SUPABASE_URL + "/rest/v1/customers?id=eq." + selectedBooking.customer_id, { headers }); const d = await r.json(); if (d[0]?.customer_number) alert("受付完了！顧客番号：" + d[0].customer_number); } if (s === "cancelled") setSelectedBooking(null); }} disabled={selectedBooking.status === "received" && s === "received"} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "2px solid " + statusColor(s), background: selectedBooking.status === s ? statusColor(s) : "white", color: selectedBooking.status === s ? "white" : statusColor(s), fontSize: 11, fontWeight: 600, cursor: selectedBooking.status === "received" && s === "received" ? "not-allowed" : "pointer", opacity: selectedBooking.status === "received" && s === "received" ? 0.5 : 1 }}>{statusLabel(s)}</button>
              ))}
            </div>
            <button onClick={() => { setChangeBookingModal(selectedBooking); setChangeBookingForm({ staff_id: selectedBooking.staff_id, course_id: selectedBooking.course_id, booking_date: selectedBooking.booking_date, booking_time: selectedBooking.booking_time, course_duration: selectedBooking.course_duration || "30分" }); fetchStaffMembers(); fetchCourseMenus(); }} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "2px solid #5a9e7a", background: "white", color: "#5a9e7a", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 6 }}>📝 予約を変更する</button>
            <button onClick={() => { setSelectedBooking(null); setTab("checkout"); }} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>💴 会計へ</button>          </div>
        </div>
      )}

    {editTicketModal && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setEditTicketModal(null)}>
        <div style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 360, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>
              {editTicketModal.type === "purchase" ? "A. 購入金券" : "B. プレゼント金券"}を編集
            </div>
            <button onClick={() => setEditTicketModal(null)} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: "#aaa" }}>×</button>
          </div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>{editTicketModal.customer.name} 様</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: editTicketModal.type === "purchase" ? "#5a9e7a" : "#e07b39", display: "block", marginBottom: 6 }}>
                枚数
              </label>
              <input
                type="number" min="0" max="99"
                value={editTicketModal.count}
                onChange={e => setEditTicketModal({ ...editTicketModal, count: Math.max(0, parseInt(e.target.value) || 0) })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `2px solid ${editTicketModal.type === "purchase" ? "#b0d8b8" : "#f0c8a0"}`, fontSize: 18, fontWeight: 700, boxSizing: "border-box", textAlign: "center" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: editTicketModal.type === "purchase" ? "#5a9e7a" : "#e07b39", display: "block", marginBottom: 6 }}>
                {editTicketModal.type === "purchase" ? "購入日" : "プレゼント日"}
              </label>
              <input
                type="date"
                value={editTicketModal.date}
                onChange={e => setEditTicketModal({ ...editTicketModal, date: e.target.value })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `2px solid ${editTicketModal.type === "purchase" ? "#b0d8b8" : "#f0c8a0"}`, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ fontSize: 11, color: "#aaa", background: "#f9f6f2", borderRadius: 8, padding: "8px 12px" }}>
              ※ 保存すると同タイプの既存有効金券を削除し、入力枚数で再発行します（有効期限: {editTicketModal.type === "purchase" ? "購入日" : "プレゼント日"}から1年）
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => setEditTicketModal(null)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>キャンセル</button>
              <button onClick={saveTicketEdit} style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: editTicketModal.type === "purchase" ? "linear-gradient(135deg, #5a9e7a, #3a7a5a)" : "linear-gradient(135deg, #e07b39, #c05020)", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>保存</button>
            </div>
          </div>
        </div>
      </div>
    )}

    {selectedCustomer && (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => { setSelectedCustomer(null); setEditingCustomer(null); }}>
    <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>{selectedCustomer.name} 様</div>
        <div style={{ display: "flex", gap: 8 }}>
          {!editingCustomer && (
            <>
              <button onClick={() => printMemberCard(selectedCustomer)} style={{ padding: "6px 16px", borderRadius: 8, border: "2px solid #e07b39", background: "white", color: "#e07b39", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🖨 カード印刷</button>
              <button onClick={() => setEditingCustomer({ ...selectedCustomer })} style={{ padding: "6px 16px", borderRadius: 8, border: "2px solid #5a9e7a", background: "white", color: "#5a9e7a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>編集</button>
              {selectedCustomer.is_deleted ? (
                <button onClick={async () => { await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${selectedCustomer.id}`, { method: "PATCH", headers, body: JSON.stringify({ is_deleted: false }) }); setSelectedCustomer(null); fetchCustomers(); }} style={{ padding: "6px 16px", borderRadius: 8, border: "2px solid #5a9e7a", background: "#5a9e7a", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>復元</button>
              ) : (
                <>
                  <button onClick={() => deleteCustomer(selectedCustomer.id, false)} style={{ padding: "6px 16px", borderRadius: 8, border: "2px solid #e07070", background: "white", color: "#e07070", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>非表示</button>
                  <button onClick={() => deleteCustomer(selectedCustomer.id, true)} style={{ padding: "6px 16px", borderRadius: 8, border: "2px solid #cc0000", background: "#cc0000", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>完全削除</button>
                </>
              )}            </>
          )}
          <button onClick={() => { setSelectedCustomer(null); setEditingCustomer(null); }} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#aaa" }}>×</button>
        </div>
      </div>
      {editingCustomer ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {[
            { label: "顧客番号", key: "customer_number" },
            { label: "氏名", key: "name" },
            { label: "フリガナ", key: "kana" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 4 }}>{f.label}</label>
              <input
                type="text"
                value={editingCustomer[f.key] || ""}
                onChange={e => setEditingCustomer({ ...editingCustomer, [f.key]: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 4 }}>生年月日</label>
            <input
              inputMode="numeric" maxLength={10} placeholder="19650401"
              value={(() => {
                const digits = (editingCustomer.birthday || "").replace(/\D/g, "").slice(0, 8);
                if (digits.length >= 7) return digits.slice(0,4) + "/" + digits.slice(4,6) + "/" + digits.slice(6);
                if (digits.length >= 5) return digits.slice(0,4) + "/" + digits.slice(4);
                return digits;
              })()}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                const dbValue = digits.length === 8
                  ? digits.slice(0,4) + "-" + digits.slice(4,6) + "-" + digits.slice(6,8)
                  : digits;
                setEditingCustomer({ ...editingCustomer, birthday: dbValue });
              }}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>
          {[
            { label: "郵便番号", key: "zipcode" },
            { label: "住所", key: "address" },
            { label: "電話番号1", key: "tel" },
            { label: "電話番号2", key: "tel2" },
            { label: "メールアドレス", key: "email" },
            { label: "LINE ユーザーID", key: "line_user_id" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 4 }}>{f.label}</label>
              <input
                type="text"
                value={editingCustomer[f.key] || ""}
                onChange={e => setEditingCustomer({ ...editingCustomer, [f.key]: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 4 }}>通知方法</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["line", "email"].map(m => (
                <button key={m} onClick={() => setEditingCustomer({ ...editingCustomer, notification_method: m })}
                  style={{ flex: 1, padding: "8px", borderRadius: 8, border: `2px solid ${editingCustomer.notification_method === m ? "#5a9e7a" : "#e8ddd0"}`, background: editingCustomer.notification_method === m ? "#eaf5ec" : "white", color: editingCustomer.notification_method === m ? "#3a5a3a" : "#aaa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {m === "line" ? "LINE" : "メール"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 4 }}>LINE連携</label>
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "#f9f6f2", fontSize: 13, color: "#3a5a3a" }}>
              {selectedCustomer.line_user_id ? "✓ 連携済" : "未連携"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button onClick={() => setEditingCustomer(null)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>キャンセル</button>
            <button onClick={async () => {
              await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${editingCustomer.id}`, {
                method: "PATCH", headers,
                body: JSON.stringify({
                  customer_number: editingCustomer.customer_number,
                  name: editingCustomer.name,
                  kana: editingCustomer.kana,
                  birthday: editingCustomer.birthday || null,
                  zipcode: editingCustomer.zipcode,
                  address: editingCustomer.address,
                  tel: editingCustomer.tel,
                  tel2: editingCustomer.tel2,
                  email: editingCustomer.email,
                  line_user_id: editingCustomer.line_user_id || null,
                  notification_method: editingCustomer.notification_method,
                }),
              });
              setSelectedCustomer({ ...selectedCustomer, ...editingCustomer });
              setEditingCustomer(null);
              fetchCustomers();
            }} style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>保存</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, background: "#f9f6f2", borderRadius: 12, padding: 16 }}>
          {[
            { label: "顧客番号", value: selectedCustomer.customer_number },
            { label: "氏名", value: selectedCustomer.name },
            { label: "フリガナ", value: selectedCustomer.kana },
            { label: "生年月日", value: selectedCustomer.birthday },
            { label: "郵便番号", value: selectedCustomer.zipcode },
            { label: "住所", value: selectedCustomer.address },
            { label: "電話番号1", value: selectedCustomer.tel },
            { label: "電話番号2", value: selectedCustomer.tel2 },
            { label: "メール", value: selectedCustomer.email },
            { label: "通知方法", value: selectedCustomer.notification_method },
            { label: "LINE", value: selectedCustomer.line_user_id ? "✓ 連携済" : "未連携" },
            { label: "ポイント", value: (selectedCustomer.points || 0) + "P" },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", borderBottom: "1px solid #f0ebe4", paddingBottom: 6 }}>
              <div style={{ fontSize: 12, color: "#7a9a7a", fontWeight: 700, width: 90, flexShrink: 0 }}>{row.label}</div>
              <div style={{ fontSize: 13, color: "#3a5a3a" }}>{row.value || "-"}</div>
            </div>
          ))}
        </div>
      )}

      {/* 保有金券 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 10 }}>保有金券</div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, background: "#f0f8f4", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#5a9e7a", marginBottom: 4 }}>A. 購入金券</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#3a5a3a" }}>{customerTickets.filter(t => t.ticket_type === "purchase").length}<span style={{ fontSize: 13, fontWeight: 400, marginLeft: 2 }}>枚</span></div>
          </div>
          <div style={{ flex: 1, background: "#fff5ee", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#e07b39", marginBottom: 4 }}>B. プレゼント金券</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#3a5a3a" }}>{customerTickets.filter(t => t.ticket_type === "present").length}<span style={{ fontSize: 13, fontWeight: 400, marginLeft: 2 }}>枚</span></div>
          </div>
          <div style={{ flex: 1, background: "#f5f5f5", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 4 }}>合計</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#3a5a3a" }}>{customerTickets.length}<span style={{ fontSize: 13, fontWeight: 400, marginLeft: 2 }}>枚</span></div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>予約履歴（{customerHistory.length}件）</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {customerHistory.length === 0 && <div style={{ color: "#aaa", fontSize: 13 }}>来院履歴がありません</div>}
        {customerHistory.map((b, i) => (
          <div key={i}>
            <div onClick={() => { if (b.status === "completed") { setSelectedVisit(selectedVisit?.id === b.id ? null : b); fetchVisitDetail(b.id); } }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#f5f5f5", borderRadius: 10, cursor: b.status === "completed" ? "pointer" : "default" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#3a5a3a" }}>{b.booking_date} {b.booking_time}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{b.course_name} / {b.staff_name}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 11, background: statusColor(b.status), color: "white", borderRadius: 20, padding: "3px 10px" }}>{statusLabel(b.status)}</div>
                {b.status === "completed" && <div style={{ fontSize: 11, color: "#5a9e7a" }}>{selectedVisit?.id === b.id ? "▲" : "▼"}</div>}
              </div>
            </div>
            {selectedVisit?.id === b.id && visitPayment && (
              <div style={{ background: "white", border: "1px solid #e8ddd0", borderRadius: 10, padding: "12px 16px", marginTop: 4 }}>
                {[
                  { label: "来院日時", value: b.booking_date + " " + b.booking_time },
                  { label: "担当者", value: b.staff_name },
                  { label: "施術メニュー", value: visitPaymentItems.filter(i => i.item_type === "course").map(i => i.item_name).join(", ") || "-" },
                  { label: "購入物品", value: visitPaymentItems.filter(i => i.item_type === "product").map(i => i.item_name + "×" + i.quantity).join(", ") || "-" },
                  { label: "小計", value: "¥" + visitPayment.subtotal?.toLocaleString() },
                  { label: "割引", value: visitPayment.discount > 0 ? "-¥" + visitPayment.discount?.toLocaleString() : "-" },
                  { label: "合計金額", value: "¥" + visitPayment.total?.toLocaleString() },
                  { label: "支払い方法", value: (visitPayment.payment_method || "").split(",").map(id => PAYMENT_METHODS.find(m => m.id === id)?.name || id).join(" / ") },
                  { label: "通知方法", value: { line: "LINE", email: "メール" }[selectedCustomer?.notification_method] || "-" },
                ].map((row, j) => (
                  <div key={j} style={{ display: "flex", padding: "6px 0", borderBottom: j < 8 ? "1px solid #f0ebe4" : "none" }}>
                    <div style={{ fontSize: 11, color: "#7a9a7a", fontWeight: 700, width: 90, flexShrink: 0 }}>{row.label}</div>
                    <div style={{ fontSize: 12, color: "#3a5a3a" }}>{row.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
)}
      {editingPlan !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setEditingPlan(null)}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 700, maxHeight: "85vh", overflow: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>{editingPlan?.id ? "テンプレート編集" : "新しいテンプレート"}</div>
              <button onClick={() => setEditingPlan(null)} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#aaa" }}>×</button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>テンプレート名</label>
              <input value={newPlanName} onChange={e => setNewPlanName(e.target.value)} placeholder="例：通常週パターン" style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>スタッフ別・曜日別設定</div>
            {staffList.map(s => (
              <div key={s.id} style={{ marginBottom: 20, background: "#f9f6f2", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#3a5a3a", marginBottom: 10 }}>{s.name}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[1,2,3,4,5,6,0].map(dayOfWeek => {
                    const dayData = editingPlan?.plan_data?.[s.id]?.[dayOfWeek] || {};
                    return (
                      <div key={dayOfWeek} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, fontSize: 12, color: dayOfWeek === 0 ? "#e07070" : dayOfWeek === 6 ? "#7090e0" : "#3a5a3a", fontWeight: 600 }}>{DAYS_FULL[dayOfWeek]}</div>
                        <button onClick={() => updatePlanData(s.id, dayOfWeek, "enabled", !dayData.enabled)} style={{ padding: "4px 12px", borderRadius: 8, border: `2px solid ${dayData.enabled ? "#5a9e7a" : "#e8ddd0"}`, background: dayData.enabled ? "#eaf5ec" : "white", color: dayData.enabled ? "#3a5a3a" : "#aaa", fontSize: 13, fontWeight: 600, cursor: "pointer", minWidth: 50 }}>
                          {dayData.enabled ? "〇" : "休み"}
                        </button>
                        {dayData.enabled && (
                          <>
                            <input type="time" value={dayData.start || "10:00"} onChange={e => updatePlanData(s.id, dayOfWeek, "start", e.target.value)} style={{ padding: "4px 8px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 12, width: 90 }} />
                            <span style={{ color: "#aaa", fontSize: 12 }}>〜</span>
                            <input type="time" value={dayData.end || "19:30"} onChange={e => updatePlanData(s.id, dayOfWeek, "end", e.target.value)} style={{ padding: "4px 8px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 12, width: 90 }} />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button onClick={savePlan} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>保存</button>
          </div>
        </div>
      )}

      {applyPlanModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setApplyPlanModal(null)}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>「{applyPlanModal.plan_name}」を適用</div>
              <button onClick={() => setApplyPlanModal(null)} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#aaa" }}>×</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>開始日</label>
              <input type="date" value={applyWeekStart} onChange={e => { setApplyWeekStart(e.target.value); setApplyWeekEnd(e.target.value); }} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>終了日</label>
              <input type="date" value={applyWeekEnd} onChange={e => setApplyWeekEnd(e.target.value)} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>指定した期間にテンプレートを適用します。</div>
            <button onClick={() => applyWeekStart && applyWeekEnd && applyPlan(applyPlanModal, applyWeekStart, applyWeekEnd)} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: applyWeekStart && applyWeekEnd ? "linear-gradient(135deg, #5a9e7a, #3a7a5a)" : "#e8ddd0", color: applyWeekStart && applyWeekEnd ? "white" : "#bbb", fontSize: 15, fontWeight: 700, cursor: applyWeekStart && applyWeekEnd ? "pointer" : "not-allowed" }}>適用する</button>
          </div>
        </div>
      )}

      {editingStaff !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setEditingStaff(null)}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>{editingStaff.id ? "スタッフ編集" : "スタッフ追加"}</div>
              <button onClick={() => setEditingStaff(null)} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#aaa" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              {[
                { label: "氏名", key: "name", placeholder: "田中 恵子", required: true },
                { label: "役職", key: "title", placeholder: "院長・施術師など" },
                { label: "専門", key: "specialty", placeholder: "得意分野" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>{f.label}{f.required && <span style={{ color: "#e07070" }}> *</span>}</label>
                  <input value={editingStaff[f.key] || ""} onChange={e => setEditingStaff({ ...editingStaff, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              {editingStaff.id && (
                <div style={{ display: "flex", gap: 10 }}>
                  {["active", "inactive"].map(v => (
                    <div key={v} onClick={() => setEditingStaff({ ...editingStaff, is_active: v === "active" })} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `2px solid ${(editingStaff.is_active ? "active" : "inactive") === v ? "#5a9e7a" : "#e8ddd0"}`, background: (editingStaff.is_active ? "active" : "inactive") === v ? "#eaf5ec" : "white", textAlign: "center", cursor: "pointer", fontSize: 13, fontWeight: 600, color: (editingStaff.is_active ? "active" : "inactive") === v ? "#3a5a3a" : "#aaa" }}>
                      {v === "active" ? "在籍中" : "退職"}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={saveStaff} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>保存</button>
          </div>
        </div>
      )}

      {editingCourse !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setEditingCourse(null)}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>{editingCourse.id ? "コース編集" : "コース追加"}</div>
              <button onClick={() => setEditingCourse(null)} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#aaa" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              {[
                { label: "コース名", key: "name", placeholder: "全身調整コース", required: true },
                { label: "時間", key: "duration", placeholder: "60分" },
                { label: "料金（円）", key: "price", placeholder: "6600", type: "number" },
                { label: "説明", key: "description", placeholder: "コースの説明" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>{f.label}{f.required && <span style={{ color: "#e07070" }}> *</span>}</label>
                  <input type={f.type || "text"} value={editingCourse[f.key] || ""} onChange={e => setEditingCourse({ ...editingCourse, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
                <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>カテゴリー</label>
                <select value={editingCourse.category || "整体"} onChange={e => setEditingCourse({ ...editingCourse, category: e.target.value })} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box", background: "white" }}>
                  <option value="整体">整体</option>
                  <option value="エステ">エステ</option>
                </select>
              </div>
              <div onClick={() => setEditingCourse({ ...editingCourse, is_first_only: !editingCourse.is_first_only })} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${editingCourse.is_first_only ? "#5a9e7a" : "#e8ddd0"}`, background: editingCourse.is_first_only ? "#5a9e7a" : "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {editingCourse.is_first_only && <span style={{ color: "white", fontSize: 12 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: "#3a5a3a" }}>初回限定コース</span>
              </div>
            </div>
            <button onClick={saveCourse} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>保存</button>
          </div>
        </div>
      )}

      {editingSubMenu !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setEditingSubMenu(null)}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>{editingSubMenu.id ? "サブメニュー編集" : "サブメニュー追加"}</div>
              <button onClick={() => setEditingSubMenu(null)} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#aaa" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              {[
                { label: "サブメニュー名", key: "name", placeholder: "ヘッドマッサージ追加", required: true },
                { label: "料金（円）", key: "price", placeholder: "1100", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>{f.label}{f.required && <span style={{ color: "#e07070" }}> *</span>}</label>
                  <input type={f.type || "text"} value={editingSubMenu[f.key] || ""} onChange={e => setEditingSubMenu({ ...editingSubMenu, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              {editingSubMenu.id && (
                <div onClick={() => setEditingSubMenu({ ...editingSubMenu, is_active: editingSubMenu.is_active === false ? true : false })} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${editingSubMenu.is_active !== false ? "#5a9e7a" : "#e8ddd0"}`, background: editingSubMenu.is_active !== false ? "#5a9e7a" : "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {editingSubMenu.is_active !== false && <span style={{ color: "white", fontSize: 12 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, color: "#3a5a3a" }}>公開する</span>
                </div>
              )}
            </div>
            <button onClick={saveSubMenu} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>保存</button>
          </div>
        </div>
      )}

      {editingProduct !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setEditingProduct(null)}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>{editingProduct.id ? "商品編集" : "商品追加"}</div>
              <button onClick={() => setEditingProduct(null)} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#aaa" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              {[
                { label: "商品名", key: "name", placeholder: "ストレッチポール", required: true },
                { label: "カテゴリ", key: "category", placeholder: "健康グッズ・サプリなど" },
                { label: "価格（円）", key: "price", placeholder: "3300", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>{f.label}{f.required && <span style={{ color: "#e07070" }}> *</span>}</label>
                  <input type={f.type || "text"} value={editingProduct[f.key] || ""} onChange={e => setEditingProduct({ ...editingProduct, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <button onClick={saveProduct} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>保存</button>
          </div>
        </div>
      )}

      {editingTicketTemplate !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setEditingTicketTemplate(null)}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>{editingTicketTemplate.id ? "金券編集" : "金券追加"}</div>
              <button onClick={() => setEditingTicketTemplate(null)} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#aaa" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              {[
                { label: "金券名", key: "name", placeholder: "1万円券・3万円券など", required: true },
                { label: "額面金額（円）", key: "face_value", placeholder: "10000", type: "number" },
                { label: "有効期限（日間）", key: "valid_days", placeholder: "365", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>{f.label}{f.required && <span style={{ color: "#e07070" }}> *</span>}</label>
                  <input type={f.type || "text"} value={editingTicketTemplate[f.key] || ""} onChange={e => setEditingTicketTemplate({ ...editingTicketTemplate, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <button onClick={saveGiftTicketTemplate} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>保存</button>
          </div>
        </div>
      )}

      <div style={{ background: "white", borderBottom: "1px solid #e8ddd0", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24 }}>🌿</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>癒楽里 {currentStore.name}</div>
            <div style={{ fontSize: 11, color: "#aaa" }}>管理画面</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { window.location.reload(); }} style={{ padding: "8px 16px", borderRadius: 10, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 13, cursor: "pointer" }}>🔄 更新</button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <button onClick={() => { setShowAdminNotif(!showAdminNotif); if (!showAdminNotif) markAdminNotifRead(); }}
                style={{ padding: "8px 14px", borderRadius: 10, border: "2px solid #e8ddd0", background: "white", color: "#3a5a3a", fontSize: 18, cursor: "pointer", position: "relative" }}>
                🔔
                {unreadAdminCount > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "#e07070", color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{unreadAdminCount}</span>}
              </button>
              {showAdminNotif && (
                <div style={{ position: "absolute", right: 0, top: 44, width: 320, background: "white", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", zIndex: 1000, maxHeight: 400, overflowY: "auto" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0e8d8", fontSize: 13, fontWeight: 700, color: "#3a5a3a" }}>通知</div>
                  {adminNotifications.length === 0 && <div style={{ padding: 20, color: "#aaa", fontSize: 13, textAlign: "center" }}>通知なし</div>}
                  {adminNotifications.map(n => (
                    <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f9f6f2", background: n.is_read ? "white" : "#f0f8f4" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: n.type === "cancel" ? "#e07070" : "#5a9e7a" }}>{n.type === "cancel" ? "❌ キャンセル" : "✅ 新規予約"}</span>
                        <span style={{ fontSize: 11, color: "#aaa" }}>{new Date(n.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#555" }}>{n.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => { setLoggedIn(false); setPassword(""); }} style={{ padding: "8px 16px", borderRadius: 10, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 13, cursor: "pointer" }}>ログアウト</button>
          </div>        </div>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #e8ddd0", background: "white", padding: "0 24px", overflowX: "auto" }}>
        {[
          { id: "calendar", label: "📅 カレンダー" },
{ id: "bookings", label: "📋 予約一覧" },
{ id: "checkin", label: "🔲 受付" },
{ id: "checkout", label: "💴 会計" },
          { id: "shifts", label: "👤 シフト管理" },
          { id: "customers", label: "👥 顧客管理" },
          { id: "notifications", label: "🔔 通知" },
          { id: "gifts", label: "🎫 金券管理" },
          { id: "messages", label: `💬 メッセージ${unreadLineCount > 0 ? `(${unreadLineCount})` : ""}` },
          { id: "report", label: "📊 日報" },
          { id: "monthlyreport", label: "📈 月報" },
          { id: "settings", label: "⚙️ 設定" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "14px 20px", border: "none", background: "none", fontSize: 14, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#3a5a3a" : "#aaa", borderBottom: tab === t.id ? "3px solid #5a9e7a" : "3px solid transparent", cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: 24, margin: "0 auto" }}>
        {tab === "messages" && (() => {
          const userMap = {};
          lineMessages.forEach(m => {
            const key = m.line_user_id;
            if (!userMap[key]) userMap[key] = { line_user_id: key, customer_id: m.customer_id, name: m.customers?.name || m.line_user_id.slice(-8), customer_number: m.customers?.customer_number, messages: [], hasUnread: false };
            userMap[key].messages.push(m);
            if (m.direction === "inbound" && !m.is_read) userMap[key].hasUnread = true;
          });
          const users = Object.values(userMap);
          return (
            <div style={{ display: "flex", gap: 16, height: 600 }}>
              <div style={{ width: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {users.length === 0 && <div style={{ color: "#aaa", fontSize: 13, padding: 16 }}>メッセージなし</div>}
                {users.map(u => (
                  <div key={u.line_user_id} onClick={() => { setSelectedLineUser(u); markLineRead(u.line_user_id); }}
                    style={{ padding: "12px 14px", borderRadius: 12, background: selectedLineUser?.line_user_id === u.line_user_id ? "#eaf5ec" : "white", border: `2px solid ${u.hasUnread ? "#5a9e7a" : "#e8ddd0"}`, cursor: "pointer" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#3a5a3a" }}>{u.name} {u.hasUnread && <span style={{ background: "#e07070", color: "white", borderRadius: 10, padding: "1px 6px", fontSize: 11 }}>新着</span>}</div>
                    {u.customer_number && <div style={{ fontSize: 11, color: "#aaa" }}>No.{u.customer_number}</div>}
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "white", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                {!selectedLineUser ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 14 }}>顧客を選択してください</div>
                ) : (
                  <>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0e8d8", fontWeight: 700, fontSize: 14, color: "#3a5a3a" }}>{selectedLineUser.name}</div>
                    <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                      {[...selectedLineUser.messages].reverse().map(m => (
                        <div key={m.id} style={{ display: "flex", justifyContent: m.direction === "outbound" ? "flex-end" : "flex-start" }}>
                          <div style={{ maxWidth: "70%", padding: "10px 14px", borderRadius: m.direction === "outbound" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.direction === "outbound" ? "#5a9e7a" : "#f0e8d8", color: m.direction === "outbound" ? "white" : "#3a5a3a", fontSize: 13 }}>
                            {m.message}
                            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: "right" }}>{new Date(m.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: 12, borderTop: "1px solid #f0e8d8", display: "flex", gap: 8 }}>
                      <input value={lineReplyText} onChange={e => setLineReplyText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendLineReply()} placeholder="返信メッセージを入力..." style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 13 }} />
                      <button onClick={sendLineReply} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#5a9e7a", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>送信</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {tab === "report" && (
          <div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", margin: 0 }}>📊 日報</h2>
              <input type="date" value={reportDate} onChange={e => { setReportDate(e.target.value); fetchDailyReport(e.target.value); }}
                style={{ padding: "8px 12px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14 }} />
            </div>
            {!dailyReport ? (
              <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>読み込み中...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* サマリー */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[
                    { label: "来院顧客数", value: dailyReport.customerCount + "名", color: "#5a9e7a" },
                    { label: "総売上", value: "¥" + (dailyReport.totalSales || 0).toLocaleString(), color: "#3a5a3a" },
                    { label: "値引き合計", value: "¥" + (dailyReport.totalDiscount || 0).toLocaleString(), color: "#e07070" },
                    { label: "キャンセル数", value: dailyReport.cancelCount + "件", color: "#e0a040" },
                  ].map(item => (
                    <div key={item.label} style={{ flex: 1, minWidth: 140, background: "white", borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "center" }}>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* 金種別 */}
                <div style={{ background: "white", borderRadius: 16, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>💴 金種別売上</div>
                  {Object.keys(dailyReport.methodTotals).length === 0 ? (
                    <div style={{ color: "#aaa", fontSize: 13 }}>データなし</div>
                  ) : (
                    Object.entries(dailyReport.methodTotals).map(([method, amount]) => (
                      <div key={method} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0e8d8" }}>
                        <span style={{ fontSize: 13 }}>{PAYMENT_METHODS.find(m => m.id === method)?.name || method}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>¥{amount.toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* スタッフ別 */}
                <div style={{ background: "white", borderRadius: 16, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>👤 スタッフ別施術数</div>
                  {Object.keys(dailyReport.staffCount).length === 0 ? (
                    <div style={{ color: "#aaa", fontSize: 13 }}>データなし</div>
                  ) : (
                    Object.entries(dailyReport.staffCount).map(([name, count]) => (
                      <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0e8d8" }}>
                        <span style={{ fontSize: 13 }}>{name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{count}件</span>
                      </div>
                    ))
                  )}
                </div>

                {/* コース別 */}
                <div style={{ background: "white", borderRadius: 16, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>📋 コース別件数</div>
                  {Object.keys(dailyReport.courseCount).length === 0 ? (
                    <div style={{ color: "#aaa", fontSize: 13 }}>データなし</div>
                  ) : (
                    Object.entries(dailyReport.courseCount).map(([name, count]) => (
                      <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0e8d8" }}>
                        <span style={{ fontSize: 13 }}>{name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{count}件</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "monthlyreport" && (
          <div>
            {/* ヘッダー・月選択 */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", margin: 0 }}>📈 月報</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => {
                  const [y, m] = monthlyReportMonth.split('-').map(Number);
                  let pm = m - 1, py = y; if (pm <= 0) { pm += 12; py--; }
                  const ns = `${py}-${String(pm).padStart(2,'0')}`;
                  setMonthlyReportMonth(ns); fetchMonthlyReport(ns);
                }} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", fontSize: 16, cursor: "pointer", color: "#5a9e7a" }}>◀</button>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a", minWidth: 100, textAlign: "center" }}>
                  {monthlyReportMonth.slice(0,4) + '年' + parseInt(monthlyReportMonth.slice(5,7)) + '月'}
                </div>
                <button onClick={() => {
                  const [y, m] = monthlyReportMonth.split('-').map(Number);
                  let nm = m + 1, ny = y; if (nm > 12) { nm -= 12; ny++; }
                  const ns = `${ny}-${String(nm).padStart(2,'0')}`;
                  setMonthlyReportMonth(ns); fetchMonthlyReport(ns);
                }} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", fontSize: 16, cursor: "pointer", color: "#5a9e7a" }}>▶</button>
              </div>
              <button onClick={() => fetchMonthlyReport(monthlyReportMonth)} style={{ padding: "8px 16px", borderRadius: 10, border: "2px solid #5a9e7a", background: "white", color: "#5a9e7a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>更新</button>
            </div>

            {monthlyReportLoading ? (
              <div style={{ textAlign: "center", padding: 60, color: "#aaa", fontSize: 14 }}>読み込み中...</div>
            ) : !monthlyReport ? (
              <div style={{ textAlign: "center", padding: 60, color: "#aaa", fontSize: 14 }}>データなし</div>
            ) : (() => {
              const target = storeSettings?.monthly_target || 0;
              const progress = target > 0 ? Math.round(monthlyReport.projected / target * 100) : null;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                  {/* 来店サマリー */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[
                      { label: "総来店数", value: monthlyReport.totalVisits + "件", color: "#3a5a3a" },
                      { label: "新規客数", value: monthlyReport.newCount + "名", color: "#5a9e7a" },
                      { label: "リピータ数", value: monthlyReport.repeatCount + "名", color: "#4a8a6a" },
                      { label: "指名客数", value: monthlyReport.nomineeCount + "件", color: "#e07070" },
                      { label: "総売上", value: "¥" + monthlyReport.totalSales.toLocaleString(), color: "#3a5a3a", big: true },
                    ].map(c => (
                      <div key={c.label} style={{ flex: "1 1 130px", background: "white", borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: c.big ? 22 : 20, fontWeight: 700, color: c.color }}>{c.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* 目標・予測・進捗 */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 160px", background: "white", borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: "#888" }}>月間目標</span>
                        {!editingMonthlyTarget && (
                          <button onClick={() => { setEditingMonthlyTarget(true); setMonthlyTargetInput(String(target)); }}
                            style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, border: "1px solid #e8ddd0", background: "white", color: "#888", cursor: "pointer" }}>編集</button>
                        )}
                      </div>
                      {editingMonthlyTarget ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                          <input type="number" value={monthlyTargetInput} onChange={e => setMonthlyTargetInput(e.target.value)}
                            style={{ width: 100, padding: "4px 8px", borderRadius: 8, border: "2px solid #5a9e7a", fontSize: 14, textAlign: "right" }} />
                          <button onClick={saveMonthlyTarget} style={{ padding: "4px 12px", borderRadius: 8, border: "none", background: "#5a9e7a", color: "white", fontSize: 12, cursor: "pointer" }}>保存</button>
                          <button onClick={() => setEditingMonthlyTarget(false)} style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #e8ddd0", background: "white", color: "#888", fontSize: 12, cursor: "pointer" }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#e0a040" }}>{target > 0 ? "¥" + target.toLocaleString() : "未設定"}</div>
                      )}
                    </div>
                    {[
                      { label: monthlyReport.isCurrentMonth ? "着地予測" : "確定売上", value: "¥" + monthlyReport.projected.toLocaleString(), color: "#5a9e7a" },
                      { label: "進捗率", value: progress !== null ? progress + "%" : "－", color: progress !== null ? (progress >= 100 ? "#5a9e7a" : progress >= 80 ? "#e0a040" : "#e07070") : "#aaa" },
                      { label: "前月比", value: monthlyReport.prevMonthRatio !== null ? monthlyReport.prevMonthRatio + "%" : "－", color: monthlyReport.prevMonthRatio !== null ? (monthlyReport.prevMonthRatio >= 100 ? "#5a9e7a" : "#e07070") : "#aaa" },
                      { label: "前年比", value: monthlyReport.prevYearRatio !== null ? monthlyReport.prevYearRatio + "%" : "－", color: monthlyReport.prevYearRatio !== null ? (monthlyReport.prevYearRatio >= 100 ? "#5a9e7a" : "#e07070") : "#aaa" },
                    ].map(c => (
                      <div key={c.label} style={{ flex: "1 1 120px", background: "white", borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* 進捗バー */}
                  {progress !== null && target > 0 && (
                    <div style={{ background: "white", borderRadius: 16, padding: "16px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#3a5a3a" }}>目標達成率 {progress}%</span>
                        <span style={{ fontSize: 12, color: "#888" }}>¥{monthlyReport.projected.toLocaleString()} / ¥{target.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 10, background: "#f0ebe4", borderRadius: 5, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: Math.min(progress, 100) + "%", background: progress >= 100 ? "linear-gradient(90deg,#5a9e7a,#3a7a5a)" : progress >= 80 ? "linear-gradient(90deg,#e0a040,#c08030)" : "linear-gradient(90deg,#e07070,#c05050)", borderRadius: 5 }} />
                      </div>
                    </div>
                  )}

                  {/* 直近6ヶ月推移 */}
                  <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 14 }}>📊 直近6ヶ月推移</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "#f5f2ef" }}>
                            {["月","総売上","前月比","総来店","新規","リピータ","指名"].map(h => (
                              <th key={h} style={{ padding: "10px 14px", textAlign: h === "月" ? "left" : "right", fontSize: 12, fontWeight: 700, color: "#7a9a7a", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...monthlyReport.history].reverse().map(row => (
                            <tr key={row.month} style={{ borderTop: "1px solid #f0ebe4", background: row.month === monthlyReport.month ? "#f0f8f4" : "white" }}>
                              <td style={{ padding: "10px 14px", fontWeight: row.month === monthlyReport.month ? 700 : 400, color: "#3a5a3a", whiteSpace: "nowrap" }}>
                                {row.month.slice(0,4) + '年' + parseInt(row.month.slice(5)) + '月'}
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#3a5a3a" }}>¥{row.totalSales.toLocaleString()}</td>
                              <td style={{ padding: "10px 14px", textAlign: "right", color: row.prevMonthRatio !== null ? (row.prevMonthRatio >= 100 ? "#5a9e7a" : "#e07070") : "#aaa" }}>
                                {row.prevMonthRatio !== null ? row.prevMonthRatio + "%" : "－"}
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "right", color: "#3a5a3a" }}>{row.totalVisits}</td>
                              <td style={{ padding: "10px 14px", textAlign: "right", color: "#5a9e7a" }}>{row.newCount}</td>
                              <td style={{ padding: "10px 14px", textAlign: "right", color: "#4a8a6a" }}>{row.repeatCount}</td>
                              <td style={{ padding: "10px 14px", textAlign: "right", color: "#e07070" }}>{row.nomineeCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* スタッフ別実績 */}
                  <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 14 }}>👤 スタッフ別実績</div>
                    {monthlyReport.staffBreakdown.length === 0 ? (
                      <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 20 }}>データなし</div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: "#f5f2ef" }}>
                              {["スタッフ","施術回数","施術売上","物販売上","指名料","来院者数","新規数","レイシオ","1日平均"].map(h => (
                                <th key={h} style={{ padding: "10px 14px", textAlign: h === "スタッフ" ? "left" : "right", fontSize: 12, fontWeight: 700, color: "#7a9a7a", whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {monthlyReport.staffBreakdown.map(s => {
                              const workDays = monthlyReport.staffWorkDays[s.staffId]?.size || 0;
                              const avg = workDays > 0 ? (s.count / workDays).toFixed(1) : "－";
                              const ratio = s.custIds.size > 0 ? (s.count / s.custIds.size).toFixed(2) : "－";
                              return (
                                <tr key={s.name} style={{ borderTop: "1px solid #f0ebe4" }}>
                                  <td style={{ padding: "10px 14px", fontWeight: 700, color: "#3a5a3a", whiteSpace: "nowrap" }}>{s.name}</td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", color: "#3a5a3a" }}>{s.count}件</td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", color: "#3a5a3a" }}>¥{s.courseSales.toLocaleString()}</td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", color: "#5a9e7a" }}>¥{s.productSales.toLocaleString()}</td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", color: "#e07070" }}>¥{s.nomineeSales.toLocaleString()}</td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", color: "#3a5a3a" }}>{s.custIds.size}名</td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", color: "#5a9e7a" }}>{s.newCount}名</td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", color: "#888" }}>{ratio}</td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", color: "#888" }}>{avg}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              );
            })()}
          </div>
        )}

        {tab === "settings" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {[
                { id: "staff", label: "👤 スタッフ管理" },
                { id: "courses", label: "📋 メニュー管理" },
                { id: "submenus", label: "➕ サブメニュー管理" },
                { id: "products", label: "🛍️ 物販商品管理" },
                { id: "booking", label: "⏰ 予約設定" },
                { id: "tickets", label: "🎫 金券管理" },
                { id: "import", label: "📥 顧客インポート" },
              ].map(t => (
                <button key={t.id} onClick={() => setSettingsSubTab(t.id)} style={{ padding: "10px 20px", borderRadius: 10, border: `2px solid ${settingsSubTab === t.id ? "#5a9e7a" : "#e8ddd0"}`, background: settingsSubTab === t.id ? "#eaf5ec" : "white", color: settingsSubTab === t.id ? "#3a5a3a" : "#aaa", fontSize: 14, fontWeight: settingsSubTab === t.id ? 700 : 400, cursor: "pointer" }}>{t.label}</button>
              ))}
            </div>

            {settingsSubTab === "staff" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>スタッフ一覧 - {currentStore.name}</div>
                  <button onClick={() => setEditingStaff({})} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>＋ スタッフ追加</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {staffMembers.length === 0 && <div style={{ textAlign: "center", padding: 40, background: "white", borderRadius: 16, color: "#aaa" }}>スタッフが登録されていません</div>}
                  {staffMembers.map((s, idx) => (
                    <div key={s.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ fontSize: 28 }}>👤</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: s.is_active ? "#3a5a3a" : "#aaa" }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>{s.title} {s.specialty && `/ ${s.specialty}`}</div>
                        </div>
                        {!s.is_active && <div style={{ fontSize: 11, background: "#f0ebe4", color: "#aaa", borderRadius: 20, padding: "2px 8px" }}>退職</div>}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={async () => { if (idx > 0) { await fetch(`${SUPABASE_URL}/rest/v1/staff_members?id=eq.${s.id}`, { method: "PATCH", headers, body: JSON.stringify({ sort_order: staffMembers[idx-1].sort_order }) }); await fetch(`${SUPABASE_URL}/rest/v1/staff_members?id=eq.${staffMembers[idx-1].id}`, { method: "PATCH", headers, body: JSON.stringify({ sort_order: s.sort_order }) }); fetchStaffMembers(); } }} style={{ padding: "6px 10px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, cursor: "pointer" }}>↑</button>
                        <button onClick={async () => { if (idx < staffMembers.length - 1) { await fetch(`${SUPABASE_URL}/rest/v1/staff_members?id=eq.${s.id}`, { method: "PATCH", headers, body: JSON.stringify({ sort_order: staffMembers[idx+1].sort_order }) }); await fetch(`${SUPABASE_URL}/rest/v1/staff_members?id=eq.${staffMembers[idx+1].id}`, { method: "PATCH", headers, body: JSON.stringify({ sort_order: s.sort_order }) }); fetchStaffMembers(); } }} style={{ padding: "6px 10px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, cursor: "pointer" }}>↓</button>
                        <button onClick={() => setEditingStaff(s)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 12, cursor: "pointer" }}>編集</button>
                        <button onClick={() => deleteStaff(s.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #ffcccc", background: "white", color: "#e07070", fontSize: 12, cursor: "pointer" }}>削除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settingsSubTab === "submenus" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>サブメニュー一覧</div>
                  <button onClick={() => setEditingSubMenu({})} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>＋ サブメニュー追加</button>
                </div>
                {subMenus.length === 0 && <div style={{ textAlign: "center", padding: 40, background: "white", borderRadius: 16, color: "#aaa" }}>サブメニューが登録されていません</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {subMenus.map((s, idx) => (
                    <div key={s.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: s.is_active ? "#3a5a3a" : "#aaa" }}>{s.name}</div>
                          {!s.is_active && <div style={{ fontSize: 10, background: "#f0ebe4", color: "#aaa", borderRadius: 10, padding: "2px 8px" }}>非公開</div>}
                        </div>
                        <div style={{ fontSize: 12, color: "#888" }}>¥{s.price?.toLocaleString()}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setEditingSubMenu(s)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 12, cursor: "pointer" }}>編集</button>
                        <button onClick={() => deleteSubMenu(s.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #ffcccc", background: "white", color: "#e07070", fontSize: 12, cursor: "pointer" }}>削除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

           {settingsSubTab === "courses" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>メニュー一覧</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["整体", "エステ"].map(cat => (
                        <button key={cat} onClick={() => setCourseTabCategory(cat)} style={{ padding: "6px 16px", borderRadius: 20, border: "2px solid " + (courseTabCategory === cat ? "#5a9e7a" : "#e8ddd0"), background: courseTabCategory === cat ? "#eaf5ec" : "white", color: courseTabCategory === cat ? "#3a5a3a" : "#aaa", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{cat}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setEditingCourse({})} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ コース追加</button>
                </div>
                {courseMenus.filter(c => (c.category || "整体") === courseTabCategory).length === 0 && <div style={{ textAlign: "center", padding: 40, background: "white", borderRadius: 16, color: "#aaa" }}>コースが登録されていません</div>}
                {["初回の方", "2回目以降の方"].map(visitType => {
                  const filtered = courseMenus.filter(c => (c.category || "整体") === courseTabCategory && (visitType === "初回の方" ? c.is_first_only : !c.is_first_only));
                  if (filtered.length === 0) return null;
                  return (
                    <div key={visitType} style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 12, color: "#888", fontWeight: 700, marginBottom: 8, marginLeft: 4 }}>{visitType}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {filtered.map((c, idx) => {
                          const globalIdx = courseMenus.findIndex(x => x.id === c.id);
                          return (
                            <div key={c.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: c.is_active ? "#3a5a3a" : "#aaa" }}>{c.name}</div>
                                  {c.is_first_only && <div style={{ fontSize: 10, background: "#ff8c69", color: "white", borderRadius: 10, padding: "2px 8px" }}>初回限定</div>}
                                  {!c.is_active && <div style={{ fontSize: 10, background: "#f0ebe4", color: "#aaa", borderRadius: 10, padding: "2px 8px" }}>非公開</div>}
                                </div>
                                <div style={{ fontSize: 12, color: "#888" }}>{c.duration} / {c.price ? "¥" + c.price.toLocaleString() : ""}</div>
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={async () => { if (globalIdx > 0) { await fetch(SUPABASE_URL + "/rest/v1/course_menus?id=eq." + c.id, { method: "PATCH", headers, body: JSON.stringify({ sort_order: courseMenus[globalIdx-1].sort_order }) }); await fetch(SUPABASE_URL + "/rest/v1/course_menus?id=eq." + courseMenus[globalIdx-1].id, { method: "PATCH", headers, body: JSON.stringify({ sort_order: c.sort_order }) }); fetchCourseMenus(); } }} style={{ padding: "6px 10px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, cursor: "pointer" }}>↑</button>
                                <button onClick={async () => { if (globalIdx < courseMenus.length - 1) { await fetch(SUPABASE_URL + "/rest/v1/course_menus?id=eq." + c.id, { method: "PATCH", headers, body: JSON.stringify({ sort_order: courseMenus[globalIdx+1].sort_order }) }); await fetch(SUPABASE_URL + "/rest/v1/course_menus?id=eq." + courseMenus[globalIdx+1].id, { method: "PATCH", headers, body: JSON.stringify({ sort_order: c.sort_order }) }); fetchCourseMenus(); } }} style={{ padding: "6px 10px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, cursor: "pointer" }}>↓</button>
                                <button onClick={() => setEditingCourse(c)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 12, cursor: "pointer" }}>編集</button>
                                <button onClick={() => deleteCourse(c.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #ffcccc", background: "white", color: "#e07070", fontSize: 12, cursor: "pointer" }}>削除</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {settingsSubTab === "products" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>物販商品一覧 - {currentStore.name}</div>
                  <button onClick={() => setEditingProduct({})} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>＋ 商品追加</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {products.length === 0 && <div style={{ textAlign: "center", padding: 40, background: "white", borderRadius: 16, color: "#aaa" }}>商品が登録されていません</div>}
                  {products.map((p, idx) => (
                    <div key={p.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a" }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>{p.category} / ¥{p.price?.toLocaleString()}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={async () => { if (idx > 0) { await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${p.id}`, { method: "PATCH", headers, body: JSON.stringify({ sort_order: products[idx-1].sort_order }) }); await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${products[idx-1].id}`, { method: "PATCH", headers, body: JSON.stringify({ sort_order: p.sort_order }) }); fetchProducts(); } }} style={{ padding: "6px 10px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, cursor: "pointer" }}>↑</button>
                        <button onClick={async () => { if (idx < products.length - 1) { await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${p.id}`, { method: "PATCH", headers, body: JSON.stringify({ sort_order: products[idx+1].sort_order }) }); await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${products[idx+1].id}`, { method: "PATCH", headers, body: JSON.stringify({ sort_order: p.sort_order }) }); fetchProducts(); } }} style={{ padding: "6px 10px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, cursor: "pointer" }}>↓</button>
                        <button onClick={() => setEditingProduct(p)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 12, cursor: "pointer" }}>編集</button>
                        <button onClick={() => deleteProduct(p.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #ffcccc", background: "white", color: "#e07070", fontSize: 12, cursor: "pointer" }}>削除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settingsSubTab === "booking" && (
              <div style={{ maxWidth: 480 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a", marginBottom: 20 }}>予約設定 - {currentStore.name}</div>
                <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 8 }}>当日予約の受付締め切り</div>
                  <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>予約希望時刻の何分前まで受け付けるか設定します</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                    {[30, 60, 90, 120].map(min => (
                      <button key={min} onClick={() => setLeadTime(min)} style={{ padding: "12px 20px", borderRadius: 12, border: `2px solid ${leadTime === min ? "#5a9e7a" : "#e8ddd0"}`, background: leadTime === min ? "#eaf5ec" : "white", color: leadTime === min ? "#3a5a3a" : "#888", fontSize: 14, fontWeight: leadTime === min ? 700 : 400, cursor: "pointer" }}>
                        {min}分前
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: "#7a9a7a", marginBottom: 20, background: "#f9f6f2", borderRadius: 10, padding: "10px 14px" }}>
                    現在の設定：<strong>予約時刻の{leadTime}分前</strong>まで受付
                  </div>
                  <button onClick={saveStoreSettings} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>保存する</button>
                </div>
              </div>
            )}

            {settingsSubTab === "tickets" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>金券テンプレート一覧</div>
                  <button onClick={() => setEditingTicketTemplate({ valid_days: 365 })} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>＋ 金券追加</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {giftTicketTemplates.length === 0 && <div style={{ textAlign: "center", padding: 40, background: "white", borderRadius: 16, color: "#aaa" }}>金券テンプレートがありません</div>}
                  {giftTicketTemplates.map(t => (
                    <div key={t.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a" }}>🎫 {t.name}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>¥{t.face_value?.toLocaleString()} / 有効期限 {t.valid_days}日間</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setEditingTicketTemplate(t)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 12, cursor: "pointer" }}>編集</button>
                        <button onClick={async () => { await fetch(`${SUPABASE_URL}/rest/v1/gift_ticket_templates?id=eq.${t.id}`, { method: "DELETE", headers }); fetchGiftTicketTemplates(); }} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #ffcccc", background: "white", color: "#e07070", fontSize: 12, cursor: "pointer" }}>削除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          {settingsSubTab === "import" && (
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a", marginBottom: 16 }}>📥 顧客CSVインポート（リピッテ形式）</div>
                <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>リピッテからエクスポートした「顧客名簿」CSVを選択してください。</div>
                  <input type="file" accept=".csv" onChange={async e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const buffer = await file.arrayBuffer();
                    const decoder = new TextDecoder('utf-16le');
                    const text = decoder.decode(buffer);
                    const lines = text.split('\n').filter(l => l.trim());
                    const rows = lines.slice(2).map(line => {
                      const cols = line.split('\t').map(c => c.replace(/^"|"$/g, '').replace(/^\uFEFF/, '').trim());
                      return {
                        name: (cols[1] + ' ' + cols[2]).trim(),
                        kana: (cols[3] + ' ' + cols[4]).trim(),
                        tel: cols[5]?.replace(/^'/, '').trim(),
                        email: cols[6]?.trim(),
                        first_visit: cols[7]?.split(' ')[0]?.trim(),
                        customer_number: cols[19]?.trim(),
                      };
                    }).filter(r => r.name && r.name !== ' ');
                    setImportData(rows);
                    setImportResult(null);
                    setImportProgress(0);
                  }} style={{ marginBottom: 16 }} />
                  {importData.length > 0 && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#3a5a3a", marginBottom: 8 }}>プレビュー：{importData.length}件</div>
                      <div style={{ background: "#f9f6f2", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                        {importData.slice(0, 3).map((r, i) => (
                          <div key={i} style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>{r.name}　{r.tel}　{r.customer_number}</div>
                        ))}
                        {importData.length > 3 && <div style={{ fontSize: 11, color: "#aaa" }}>...他{importData.length - 3}件</div>}
                      </div>
                      {importLoading ? (
                        <div>
                          <div style={{ background: "#e8e8e8", borderRadius: 20, height: 12, overflow: "hidden", marginBottom: 8 }}>
                            <div style={{ background: "#5a9e7a", height: "100%", borderRadius: 20, width: `${importProgress}%`, transition: "width 0.3s" }} />
                          </div>
                          <div style={{ fontSize: 13, color: "#888", textAlign: "center" }}>{Math.round(importProgress)}% 処理中...</div>
                        </div>
                      ) : (
                        <button onClick={async () => {
                          setImportLoading(true);
                          setImportProgress(0);
                          setImportResult(null);
                          let success = 0, skip = 0;
                          for (let i = 0; i < importData.length; i++) {
                            const r = importData[i];
                            // 電話番号で重複チェック（電話番号がある場合のみ）
                            if (r.tel && r.tel.length > 5) {
                              const check = await fetch(`${SUPABASE_URL}/rest/v1/customers?tel=eq.${r.tel}&select=id`, { headers });
                              const exists = await check.json();
                              if (exists && exists.length > 0) { skip++; setImportProgress((i + 1) / importData.length * 100); continue; }
                            }
                            await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
                              method: "POST", headers,
                              body: JSON.stringify({ name: r.name, kana: r.kana, tel: r.tel, email: r.email, first_visit: r.first_visit || null, customer_number: r.customer_number }),
                            });
                            success++;
                            setImportProgress((i + 1) / importData.length * 100);
                          }
                          setImportResult({ success, skip });
                          setImportLoading(false);
                        }} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "#5a9e7a", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                          取り込み開始（{importData.length}件）
                        </button>
                      )}
                      {importResult && (
                        <div style={{ marginTop: 16, background: "#eaf5ec", borderRadius: 12, padding: 16, textAlign: "center" }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>✅ 完了</div>
                          <div style={{ fontSize: 13, color: "#555", marginTop: 8 }}>成功：{importResult.success}件　スキップ（重複）：{importResult.skip}件</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

{tab === "checkin" && (
  <div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", margin: 0 }}>🔲 QR受付 - {currentStore.name}</h2>
    </div>
    <div style={{ maxWidth: 800 }}>
      <div style={{ background: "white", borderRadius: 20, padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", marginBottom: 24, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔲</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a", marginBottom: 8 }}>QRコードをかざしてください</div>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20 }}>リーダーにかざすと自動で受付されます</div>
        <input
          autoFocus
          value={qrInput}
          onChange={e => setQrInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && qrInput) handleAdminQrInput(qrInput); }}
          style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box", textAlign: "center", outline: "none", color: "#aaa" }}
          placeholder="QRリーダー入力待ち..."
        />
        {checkinResult && (
          <div style={{ marginTop: 16, padding: "16px 24px", borderRadius: 14, background: checkinResult.status === "ok" ? "#eaf5ec" : "#fff0f0", border: `2px solid ${checkinResult.status === "ok" ? "#3a5a3a" : "#e07070"}`, fontSize: 16, fontWeight: 700, color: checkinResult.status === "ok" ? "#3a5a3a" : "#e07070" }}>
            {checkinResult.status === "ok" ? "✅ " : "❌ "}{checkinResult.message}
          </div>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>本日の受付済み（{todayReceived.length}名）</div>
      {todayReceived.length === 0 ? (
        <div style={{ textAlign: "center", padding: 32, background: "white", borderRadius: 16, color: "#aaa", fontSize: 13 }}>まだ受付がありません</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {todayReceived.map(b => (
            <div key={b.id} style={{ background: "white", borderRadius: 16, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", borderTop: `4px solid ${statusColor(b.status)}`, textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>{b.customers?.name || "不明"} 様</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{b.booking_time} / {b.course_name}</div>
              <div style={{ fontSize: 12, background: statusColor(b.status), color: "white", borderRadius: 20, padding: "4px 12px", display: "inline-block" }}>{statusLabel(b.status)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
        {tab === "checkout" && (
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            {!checkoutBooking ? (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", marginBottom: 8 }}>会計</h2>
                <div style={{ marginBottom: 16 }}>
                  <input type="date" defaultValue={formatDate(new Date())} onChange={e => { fetchTodayBookings(e.target.value); fetchCompletedBookings(e.target.value); }} style={{ padding: "10px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: "#3a5a3a" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {todayBookings.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#aaa", background: "white", borderRadius: 16 }}>予約がありません</div>}
                  {todayBookings.map(b => (
                    <div key={b.id} style={{ background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a" }}>{b.customers?.name || "未登録"}</div>
                          <div style={{ fontSize: 12, background: statusColor(b.status), color: "white", borderRadius: 20, padding: "2px 8px" }}>{statusLabel(b.status)}</div>
                        </div>
                        <div style={{ fontSize: 12, color: "#888" }}>{b.booking_time} / {b.course_name} / {b.staff_name}</div>
                      </div>
                      {b.status !== "completed" && b.status !== "cancelled" && (
                        <button onClick={() => startCheckout(b)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>会計する</button>
                      )}
                    </div>
                  ))}
                </div>
                {completedBookings.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>✅ 会計済み</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {completedBookings.map(b => (
                        <div key={b.id} style={{ background: "white", borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a" }}>{b.customers?.name || "未登録"}</div>
                              <div style={{ fontSize: 12, color: "#888" }}>{b.booking_time} / {b.course_name} / {b.staff_name}</div>
                              {b.payment && <div style={{ fontSize: 13, color: "#5a9e7a", fontWeight: 700, marginTop: 4 }}>¥{b.payment.total?.toLocaleString()}</div>}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => setSelectedCompletedPayment(selectedCompletedPayment?.id === b.id ? null : b)}
                                style={{ padding: "8px 14px", borderRadius: 10, border: "2px solid #5a9e7a", background: "white", color: "#5a9e7a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                {selectedCompletedPayment?.id === b.id ? "閉じる" : "詳細"}
                              </button>
                              <button onClick={() => revertPayment(b)}
                                style={{ padding: "8px 14px", borderRadius: 10, border: "2px solid #e07070", background: "white", color: "#e07070", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                修正
                              </button>
                            </div>
                          </div>
                          {selectedCompletedPayment?.id === b.id && b.payment && (
                            <div style={{ marginTop: 12, padding: "12px", background: "#f9f6f2", borderRadius: 10 }}>
                              {b.paymentItems.map((item, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "1px solid #f0e8d8" }}>
                                  <span>{item.item_name}</span>
                                  <span>¥{(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                              ))}
                              {b.payment.discount > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", color: "#e07070" }}>
                                  <span>値引き{b.payment.discount_reason ? `（${b.payment.discount_reason}）` : ""}</span>
                                  <span>-¥{b.payment.discount?.toLocaleString()}</span>
                                </div>
                              )}
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, padding: "8px 0 4px", borderTop: "2px solid #e8ddd0", marginTop: 4 }}>
                                <span>合計</span>
                                <span>¥{b.payment.total?.toLocaleString()}</span>
                              </div>
                              <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                                {(b.payment.payment_method || "").split(",").map(id => PAYMENT_METHODS.find(m => m.id === id)?.name || id).join(" / ")}
                                {b.payment.payment_methods?.length > 0 && (
                                  <span>　{b.payment.payment_methods.map(pm => `${PAYMENT_METHODS.find(m => m.id === pm.method)?.name || pm.method}:¥${pm.amount?.toLocaleString()}`).join(" / ")}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : checkoutComplete ? (
              <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", paddingTop: 40 }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#3a5a3a", marginBottom: 8 }}>会計完了！</div>
                <div style={{ fontSize: 14, color: "#7a9a7a", marginBottom: 32 }}>{checkoutResult?.customerName} 様</div>
                <div style={{ background: "linear-gradient(135deg, #eaf5ec, #e0f0e8)", borderRadius: 16, padding: "24px", marginBottom: 24 }}>
                  <div style={{ fontSize: 13, color: "#7a9a7a", marginBottom: 4 }}>お支払い金額</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#3a5a3a" }}>{formatPrice(checkoutResult?.total || 0)}</div>
                  <div style={{ fontSize: 13, color: "#7a9a7a", marginTop: 8 }}>{checkoutResult?.paymentMethod?.split(",").map(id => PAYMENT_METHODS.find(m => m.id === id)?.name).join(" / ")}</div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => { setCheckoutBooking(null); setCheckoutComplete(false); }} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "2px solid #5a9e7a", background: "white", color: "#5a9e7a", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>戻る</button>
                  <button onClick={printReceipt} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>🖨️ レシート印刷</button>                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 300 }}>
                  <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a", marginBottom: 16 }}>{checkoutBooking.customers?.name || "お客様"} 様の会計</div>
                    {connectedBooking && (
                      <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, background: includeConnectedBooking ? "#e8f5ee" : "#f9f6f2", border: "2px solid " + (includeConnectedBooking ? "#52b788" : "#e8ddd0") }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>連続予約あり</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#3a5a3a" }}>{connectedBooking.course_name} も合算する</div>
                            <div style={{ fontSize: 11, color: "#aaa" }}>{connectedBooking.booking_time}〜 / {connectedBooking.course_duration}</div>
                          </div>
                          <button onClick={() => {
                            const newVal = !includeConnectedBooking;
                            setIncludeConnectedBooking(newVal);
                            if (newVal) {
                              const connCourse = courseMenus.find(c => c.id === connectedBooking.course_id) || { name: connectedBooking.course_name, price: 0 };
                              setCheckoutItems(prev => prev.find(i => i.connectedBookingId === connectedBooking.id) ? prev : [...prev, { type: "course", name: connCourse.name, price: connCourse.price || 0, quantity: 1, connectedBookingId: connectedBooking.id }]);
                            } else {
                              setCheckoutItems(prev => prev.filter(i => i.connectedBookingId !== connectedBooking.id));
                            }
                          }} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: includeConnectedBooking ? "#52b788" : "#e8ddd0", color: includeConnectedBooking ? "white" : "#888", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                            {includeConnectedBooking ? "✓ 合算中" : "合算する"}
                          </button>
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                      {checkoutItems.map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#f9f6f2", borderRadius: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#3a5a3a" }}>{item.name}</div>
                            <div style={{ fontSize: 11, color: "#aaa" }}>{formatPrice(item.price)} × {item.quantity}</div>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginRight: 12 }}>{formatPrice(item.price * item.quantity)}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={() => updateQuantity(i, item.quantity - 1)} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #e8ddd0", background: "white", cursor: "pointer", fontSize: 14 }}>－</button>
                            <span style={{ fontSize: 13, minWidth: 16, textAlign: "center" }}>{item.quantity}</span>
                            <button onClick={() => updateQuantity(i, item.quantity + 1)} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #e8ddd0", background: "white", cursor: "pointer", fontSize: 14 }}>＋</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: "1px solid #f0ebe4", paddingTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: "#888" }}>小計</span>
                        <span style={{ fontSize: 13, color: "#3a5a3a" }}>{formatPrice(subtotal)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: "#888" }}>割引</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, color: "#888" }}>¥</span>
                          <input type="number" value={checkoutDiscount} onChange={e => setCheckoutDiscount(parseInt(e.target.value) || 0)} style={{ width: 80, padding: "4px 8px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 13, textAlign: "right" }} />
                        </div>
                      </div>
                      {checkoutDiscount > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <input value={checkoutDiscountReason} onChange={e => setCheckoutDiscountReason(e.target.value)} placeholder="値引き理由を入力..." style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 12, boxSizing: "border-box" }} />
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "2px solid #e8ddd0" }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>合計</span>
                        <span style={{ fontSize: 20, fontWeight: 700, color: "#5a9e7a" }}>{formatPrice(total)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>支払い方法</div>
                    {checkoutPaymentMethods.map((pm, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <select value={pm.method} onChange={e => setCheckoutPaymentMethods(checkoutPaymentMethods.map((p, i) => i === idx ? { ...p, method: e.target.value } : p))}
                          style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 13 }}>
                          {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.icon} {m.name}</option>)}
                        </select>
                        <span style={{ fontSize: 13, color: "#888" }}>¥</span>
                        <input type="number" value={pm.amount || ""} onChange={e => setCheckoutPaymentMethods(checkoutPaymentMethods.map((p, i) => i === idx ? { ...p, amount: parseInt(e.target.value) || 0 } : p))}
                          style={{ width: 90, padding: "8px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 13, textAlign: "right" }} />
                        <button onClick={() => idx === 0
                          ? setCheckoutPaymentMethods(checkoutPaymentMethods.map((p, i) => i === 0 ? { ...p, method: "cash", amount: 0 } : p))
                          : setCheckoutPaymentMethods(checkoutPaymentMethods.filter((_, i) => i !== idx))}
                          style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "#f0e8d8", color: "#e07070", cursor: "pointer" }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => setCheckoutPaymentMethods([...checkoutPaymentMethods, { method: "cash", amount: 0 }])}
                      style={{ width: "100%", padding: "8px", borderRadius: 10, border: "2px dashed #e8ddd0", background: "white", color: "#aaa", fontSize: 13, cursor: "pointer", marginTop: 4 }}>
                      ＋ 支払い方法を追加
                    </button>
                    {(() => {
                      const paid = checkoutPaymentMethods.reduce((s, p) => s + p.amount, 0);
                      const diff = paid - total;
                      return paid > 0 ? (
                        <div style={{ marginTop: 8, fontSize: 12, color: diff === 0 ? "#5a9e7a" : diff > 0 ? "#e07070" : "#e0a040", fontWeight: 700 }}>
                          {diff === 0 ? "✅ 金額が一致しています" : diff > 0 ? `⚠️ ${formatPrice(diff)} 過払い` : `⚠️ ${formatPrice(-diff)} 不足`}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={() => setCheckoutBooking(null)} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>戻る</button>
                    <button onClick={savePayment} style={{ flex: 2, padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>✓ 会計を確定する</button>
                  </div>
                </div>
                <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>➕ サブメニューを追加</div>
                    {subMenus.filter(s => s.is_active).length === 0 ? (
                      <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 20 }}>サブメニューが登録されていません</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {subMenus.filter(s => s.is_active).map(s => (
                          <div key={s.id} onClick={() => addSubMenu(s)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#f9f6f2", borderRadius: 10, cursor: "pointer" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#3a5a3a" }}>{s.name}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#5a9e7a" }}>{formatPrice(s.price)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>物販を追加</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <input
                        type="text" placeholder="品名"
                        value={checkoutFreeProduct.name}
                        onChange={e => setCheckoutFreeProduct(p => ({ ...p, name: e.target.value }))}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 13, boxSizing: "border-box" }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: "#7a9a7a", marginBottom: 3 }}>単価（円）</div>
                          <input
                            type="number" min="0" placeholder="0"
                            value={checkoutFreeProduct.price}
                            onChange={e => setCheckoutFreeProduct(p => ({ ...p, price: e.target.value }))}
                            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 13, boxSizing: "border-box" }}
                          />
                        </div>
                        <div style={{ width: 72 }}>
                          <div style={{ fontSize: 11, color: "#7a9a7a", marginBottom: 3 }}>数量</div>
                          <input
                            type="number" min="1"
                            value={checkoutFreeProduct.quantity}
                            onChange={e => setCheckoutFreeProduct(p => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 13, boxSizing: "border-box" }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (!checkoutFreeProduct.name || !checkoutFreeProduct.price) return;
                          setCheckoutItems(prev => [...prev, {
                            type: "product",
                            name: checkoutFreeProduct.name,
                            price: parseInt(checkoutFreeProduct.price) || 0,
                            quantity: checkoutFreeProduct.quantity,
                          }]);
                          setCheckoutFreeProduct({ name: "", price: "", quantity: 1 });
                        }}
                        disabled={!checkoutFreeProduct.name || !checkoutFreeProduct.price}
                        style={{ width: "100%", padding: "9px", borderRadius: 10, border: "none", background: checkoutFreeProduct.name && checkoutFreeProduct.price ? "linear-gradient(135deg, #5a9e7a, #3a7a5a)" : "#e8ddd0", color: checkoutFreeProduct.name && checkoutFreeProduct.price ? "white" : "#bbb", fontSize: 13, fontWeight: 700, cursor: checkoutFreeProduct.name && checkoutFreeProduct.price ? "pointer" : "not-allowed" }}>
                        ＋ 追加
                      </button>
                    </div>
                  </div>
                  <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>🎫 金券</div>
                    {checkoutBooking?.customer_id ? (
                      <>
                        {/* 保有枚数・使用 */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", marginBottom: 8 }}>保有・使用</div>
                          {customerTickets.length === 0 ? (
                            <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: 12 }}>金券がありません</div>
                          ) : (
                            <>
                              {/* A. 購入金券 */}
                              {(() => {
                                const purchaseTickets = customerTickets.filter(t => t.ticket_type === "purchase");
                                if (purchaseTickets.length === 0) return null;
                                const useCount = checkoutTicketUse.purchase;
                                return (
                                  <div style={{ background: "#f0f8f4", borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#5a9e7a", marginBottom: 6 }}>A. 購入金券（{purchaseTickets.length}枚）</div>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <button onClick={() => setCheckoutTicketUse(u => ({ ...u, purchase: Math.max(0, u.purchase - 1) }))} style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #b0d8b8", background: "white", cursor: "pointer", fontSize: 15, color: "#3a7a5a" }}>－</button>
                                        <span style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", minWidth: 24, textAlign: "center" }}>{useCount}</span>
                                        <button onClick={() => setCheckoutTicketUse(u => ({ ...u, purchase: Math.min(purchaseTickets.length, u.purchase + 1) }))} style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #b0d8b8", background: "white", cursor: "pointer", fontSize: 15, color: "#3a7a5a" }}>＋</button>
                                        <span style={{ fontSize: 11, color: "#888" }}>枚使用</span>
                                      </div>
                                      <button onClick={async () => {
                                        if (useCount === 0) return;
                                        const targets = purchaseTickets.slice(0, useCount);
                                        const usedAt = new Date().toISOString();
                                        for (const t of targets) {
                                          await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets?id=eq.${t.id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "used", used_at: usedAt }) });
                                        }
                                        setCheckoutTicketUse(u => ({ ...u, purchase: 0 }));
                                        await fetchCustomerTicketCount(checkoutBooking.customer_id);
                                      }} disabled={useCount === 0} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: useCount > 0 ? "linear-gradient(135deg, #5a9e7a, #3a7a5a)" : "#e8ddd0", color: useCount > 0 ? "white" : "#bbb", fontSize: 12, fontWeight: 700, cursor: useCount > 0 ? "pointer" : "not-allowed" }}>
                                        {useCount}枚使用する
                                      </button>
                                    </div>
                                    <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>最短期限: {purchaseTickets[0]?.expires_at}</div>
                                  </div>
                                );
                              })()}
                              {/* B. プレゼント金券 */}
                              {(() => {
                                const presentTickets = customerTickets.filter(t => t.ticket_type === "present");
                                if (presentTickets.length === 0) return null;
                                const useCount = checkoutTicketUse.present;
                                return (
                                  <div style={{ background: "#fff8f0", borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#e07b39", marginBottom: 6 }}>B. プレゼント金券（{presentTickets.length}枚）</div>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <button onClick={() => setCheckoutTicketUse(u => ({ ...u, present: Math.max(0, u.present - 1) }))} style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #f0c8a0", background: "white", cursor: "pointer", fontSize: 15, color: "#c06020" }}>－</button>
                                        <span style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", minWidth: 24, textAlign: "center" }}>{useCount}</span>
                                        <button onClick={() => setCheckoutTicketUse(u => ({ ...u, present: Math.min(presentTickets.length, u.present + 1) }))} style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #f0c8a0", background: "white", cursor: "pointer", fontSize: 15, color: "#c06020" }}>＋</button>
                                        <span style={{ fontSize: 11, color: "#888" }}>枚使用</span>
                                      </div>
                                      <button onClick={async () => {
                                        if (useCount === 0) return;
                                        const targets = presentTickets.slice(0, useCount);
                                        const usedAt = new Date().toISOString();
                                        for (const t of targets) {
                                          await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets?id=eq.${t.id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "used", used_at: usedAt }) });
                                        }
                                        setCheckoutTicketUse(u => ({ ...u, present: 0 }));
                                        await fetchCustomerTicketCount(checkoutBooking.customer_id);
                                      }} disabled={useCount === 0} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: useCount > 0 ? "linear-gradient(135deg, #e07b39, #c05020)" : "#e8ddd0", color: useCount > 0 ? "white" : "#bbb", fontSize: 12, fontWeight: 700, cursor: useCount > 0 ? "pointer" : "not-allowed" }}>
                                        {useCount}枚使用する
                                      </button>
                                    </div>
                                    <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>最短期限: {presentTickets[0]?.expires_at}</div>
                                  </div>
                                );
                              })()}
                            </>
                          )}
                        </div>

                        {/* 金券販売 */}
                        <div style={{ borderTop: "1px solid #f0ebe4", paddingTop: 14, marginBottom: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", marginBottom: 8 }}>🎫 販売</div>
                          <select value={checkoutSellTicketId || ""} onChange={e => setCheckoutSellTicketId(e.target.value)}
                            style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 13, background: "white", marginBottom: 8, boxSizing: "border-box" }}>
                            <option value="">金券を選択</option>
                            {giftTicketTemplates.filter(t => t.is_active).map(t => (
                              <option key={t.id} value={t.id}>{t.name}（¥{t.face_value?.toLocaleString()}券×{t.ticket_count || 10}枚）</option>
                            ))}
                          </select>
                          <button onClick={async () => {
                            if (!checkoutSellTicketId) return;
                            const template = giftTicketTemplates.find(t => t.id === checkoutSellTicketId);
                            if (!template) return;
                            const count = template.ticket_count || 10;
                            const today = new Date();
                            const expires = new Date(today);
                            expires.setFullYear(expires.getFullYear() + 1);
                            const groupId = crypto.randomUUID();
                            for (let i = 0; i < count; i++) {
                              await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets`, {
                                method: "POST", headers,
                                body: JSON.stringify({
                                  store_id: currentStore.id,
                                  customer_id: checkoutBooking.customer_id,
                                  ticket_type: "purchase",
                                  purchase_group_id: groupId,
                                  ticket_name: template.name,
                                  face_value: template.face_value,
                                  issued_at: formatDate(today),
                                  expires_at: formatDate(expires),
                                  status: "active",
                                }),
                              });
                            }
                            await fetchCustomerTicketCount(checkoutBooking.customer_id);
                            setCheckoutSellTicketId("");
                            // 合計に追加
                            setCheckoutItems(prev => [...prev, { type: "gift", name: `金券販売 ${template.name}`, price: template.sale_price || template.face_value * count, quantity: 1 }]);
                            alert(`${template.name}を${count}枚発行しました`);
                          }} disabled={!checkoutSellTicketId}
                            style={{ width: "100%", padding: "9px", borderRadius: 10, border: "none", background: checkoutSellTicketId ? "linear-gradient(135deg, #5a9e7a, #3a7a5a)" : "#e8ddd0", color: checkoutSellTicketId ? "white" : "#bbb", fontSize: 13, fontWeight: 700, cursor: checkoutSellTicketId ? "pointer" : "not-allowed" }}>
                            💳 販売して発行
                          </button>
                        </div>

                        {/* 金券プレゼント */}
                        <div style={{ borderTop: "1px solid #f0ebe4", paddingTop: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#e0a040", marginBottom: 8 }}>🎁 プレゼント</div>
                          <select value={checkoutPresentTicketId || ""} onChange={e => setCheckoutPresentTicketId(e.target.value)}
                            style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 13, background: "white", marginBottom: 8, boxSizing: "border-box" }}>
                            <option value="">金券を選択</option>
                            {giftTicketTemplates.filter(t => t.is_active).map(t => (
                              <option key={t.id} value={t.id}>{t.name}（¥{t.face_value?.toLocaleString()}券×1枚）</option>
                            ))}
                          </select>
                          <button onClick={async () => {
                            if (!checkoutPresentTicketId) return;
                            const template = giftTicketTemplates.find(t => t.id === checkoutPresentTicketId);
                            if (!template) return;
                            const today = new Date();
                            const expires = new Date(today);
                            expires.setFullYear(expires.getFullYear() + 1);
                            await fetch(`${SUPABASE_URL}/rest/v1/gift_tickets`, {
                              method: "POST", headers,
                              body: JSON.stringify({
                                store_id: currentStore.id,
                                customer_id: checkoutBooking.customer_id,
                                ticket_type: "present",
                                purchase_group_id: crypto.randomUUID(),
                                ticket_name: template.name,
                                face_value: template.face_value,
                                issued_at: formatDate(today),
                                expires_at: formatDate(expires),
                                status: "active",
                              }),
                            });
                            await fetchCustomerTicketCount(checkoutBooking.customer_id);
                            setCheckoutPresentTicketId("");
                            alert(`${template.name}を1枚プレゼントしました`);
                          }} disabled={!checkoutPresentTicketId}
                            style={{ width: "100%", padding: "9px", borderRadius: 10, border: "none", background: checkoutPresentTicketId ? "linear-gradient(135deg, #e0a040, #c07020)" : "#e8ddd0", color: checkoutPresentTicketId ? "white" : "#bbb", fontSize: 13, fontWeight: 700, cursor: checkoutPresentTicketId ? "pointer" : "not-allowed" }}>
                            🎁 プレゼントとして発行
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ color: "#aaa", fontSize: 12, textAlign: "center", padding: 12 }}>顧客情報がある予約のみ金券を利用できます</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {changeBookingModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "white", borderRadius: 20, padding: 28, width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a", marginBottom: 4 }}>📝 予約変更</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>{changeBookingModal.customers?.name || ""}様 → {changeBookingModal.booking_date} {changeBookingModal.booking_time}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>新しい日付</div>
                  <input type="date" value={changeBookingForm.booking_date || ""} onChange={e => setChangeBookingForm({ ...changeBookingForm, booking_date: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>新しい時間</div>
                  <select value={changeBookingForm.booking_time || ""} onChange={e => setChangeBookingForm({ ...changeBookingForm, booking_time: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 13 }}>
                    <option value="">選択してください</option>
                    {["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>担当スタッフ</div>
                  <select value={changeBookingForm.staff_id || ""} onChange={e => setChangeBookingForm({ ...changeBookingForm, staff_id: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 13 }}>
                    <option value="">選択してください</option>
                    {staffMembers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>コース</div>
                  <select value={changeBookingForm.course_id || ""} onChange={e => {
                    const course = courseMenus.find(c => c.id === e.target.value);
                    setChangeBookingForm({ ...changeBookingForm, course_id: e.target.value, course_duration: course?.duration || "30分" });
                  }}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 13 }}>
                    <option value="">選択してください</option>
                    {courseMenus.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>所要時間</div>
                  <select value={changeBookingForm.course_duration || "30分"} onChange={e => setChangeBookingForm({ ...changeBookingForm, course_duration: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 13 }}>
                    {["30分", "60分", "90分", "120分", "150分"].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <button onClick={saveChangeBooking} disabled={!changeBookingForm.booking_date || !changeBookingForm.booking_time || !changeBookingForm.course_id}
                  style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: changeBookingForm.booking_date && changeBookingForm.booking_time && changeBookingForm.course_id ? "#5a9e7a" : "#e8ddd0", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  変更を確定する
                </button>
                <button onClick={() => { setChangeBookingModal(null); setChangeBookingForm({}); }}
                  style={{ width: "100%", padding: "10px", borderRadius: 12, border: "2px solid #e8ddd0", background: "white", color: "#aaa", fontSize: 13, cursor: "pointer" }}>
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {blockModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "white", borderRadius: 20, padding: 28, width: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a", marginBottom: 4 }}>⏰ {blockModal.time}</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>{staffList.find(s => s.id === blockModal.staffId)?.name}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => { setBlockModal(null); setDirectBookingModal({ date: selectedDate, staffId: blockModal.staffId, time: blockModal.time }); setDirectBookingForm({ staff_id: blockModal.staffId, booking_time: blockModal.time }); setCustomerSearchQuery(""); setCustomerSearchResult(null); fetchCourseMenus(); }}
                  style={{ padding: "14px", borderRadius: 12, border: "none", background: "#5a9e7a", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  📅 予約を入れる
                </button>
                <div style={{ background: "#f9f6f2", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#3a5a3a", marginBottom: 10 }}>🔒 ブロックする</div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>時間</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => setBlockDuration(n)}
                          style={{ padding: "6px 12px", borderRadius: 8, border: `2px solid ${blockDuration === n ? "#e07070" : "#e8ddd0"}`, background: blockDuration === n ? "#fdf0f0" : "white", color: blockDuration === n ? "#e07070" : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          {n * 30}分
                        </button>
                      ))}
                    </div>
                  </div>
                  <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="理由（例：社内研修）" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 13, boxSizing: "border-box", marginBottom: 10 }} />
                  <button onClick={addBlock} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "#e07070", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    🔒 ブロックする
                  </button>
                </div>
                <button onClick={() => { setBlockModal(null); setBlockReason(""); setBlockDuration(1); }} style={{ padding: "10px", borderRadius: 10, border: "2px solid #e8ddd0", background: "white", color: "#aaa", fontSize: 13, cursor: "pointer" }}>
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "calendar" && (
          <div>
            <div
              onDragOver={draggedBooking && !draggedBooking.isStaged ? (e => { e.preventDefault(); setDragOverStaging(true); }) : undefined}
              onDragLeave={draggedBooking && !draggedBooking.isStaged ? (() => setDragOverStaging(false)) : undefined}
              onDrop={draggedBooking && !draggedBooking.isStaged ? (e => { e.preventDefault(); dropToStaging(); }) : undefined}
              style={{ marginBottom: 8 }}
            >
              {(stagedBookings.length > 0 || draggedBooking) && (
                <div style={{ background: dragOverStaging ? "#d4f0dc" : stagedBookings.length > 0 ? "#f0f8f4" : "#f9f9f9", border: `2px dashed ${dragOverStaging ? "#5a9e7a" : stagedBookings.length > 0 ? "#a0d4b8" : "#e0e0e0"}`, borderRadius: 12, padding: "10px 16px", transition: "all 0.15s" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#7a9a7a", marginBottom: stagedBookings.length > 0 ? 8 : 0 }}>
                    📌 仮置きエリア{stagedBookings.length > 0 ? `（${stagedBookings.length}件）` : "　← ここにドロップで仮置き"}
                  </div>
                  {stagedBookings.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {stagedBookings.map(b => (
                        <div key={b.id}
                          draggable={true}
                          onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDraggedBooking({ ...b, isStaged: true }); }}
                          onDragEnd={() => { setDraggedBooking(null); setDragOverCell(null); }}
                          style={{ display: "flex", alignItems: "center", gap: 6, background: "white", border: "2px solid #a0d4b8", borderRadius: 10, padding: "6px 10px", cursor: "grab", opacity: draggedBooking?.id === b.id ? 0.5 : 1 }}
                        >
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#3a5a3a" }}>{b.customers?.name || "予約"}</div>
                            <div style={{ fontSize: 10, color: "#888" }}>元：{b.booking_date} {b.booking_time}　{b.staff_name}</div>
                          </div>
                          <button onClick={() => setStagedBookings(prev => prev.filter(s => s.id !== b.id))}
                            style={{ border: "none", background: "none", color: "#e07070", fontSize: 16, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "nowrap", alignItems: "flex-start" }}>
              <div style={{ background: "white", borderRadius: 16, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", minWidth: 240 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1, 1))} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#5a9e7a" }}>‹</button>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>{currentMonth.getFullYear()}年{currentMonth.getMonth()+1}月</div>
                  <button onClick={() => { const today = new Date(); setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(today); fetchAll(today); }} style={{ padding: "2px 10px", borderRadius: 6, border: "2px solid #5a9e7a", background: "#eaf5ec", color: "#3a5a3a", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>今日</button>
                </div>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 1))} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#5a9e7a" }}>›</button>              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                {DAYS_JP.map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#aaa", padding: "4px 0" }}>{d}</div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {getDaysInMonth(currentMonth).map((d, i) => {
                  if (!d) return <div key={i} />;
                  const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString();
                  const isToday = d.toDateString() === new Date().toDateString();
                  const dayIdx = d.getDay();
                  const dateStr = formatDate(d);
                  const hasBooking = monthBookingDates.has(dateStr);
                  return (
                    <div key={i} onClick={() => setSelectedDate(d)} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, cursor: "pointer", background: isSelected ? "#3a5a3a" : isToday ? "#eaf5ec" : "white", color: isSelected ? "white" : dayIdx === 0 ? "#e07070" : dayIdx === 6 ? "#7090e0" : "#3a5a3a", fontWeight: isToday ? 700 : 400, fontSize: 13, border: hasBooking && !isSelected ? "2px solid #e07070" : isToday && !isSelected ? "2px solid #5a9e7a" : "2px solid transparent" }}>                      {d.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
            {selectedDate && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>{selectedDate.getMonth()+1}月{selectedDate.getDate()}日（{DAYS_JP[selectedDate.getDay()]}）</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {["09:00","09:30"].map(t => (
                        <button key={t} onClick={() => toggleSlot(t)} style={{ padding: "6px 12px", borderRadius: 8, border: `2px solid ${isSlotExtended(t) ? "#5a9e7a" : "#e8ddd0"}`, background: isSlotExtended(t) ? "#eaf5ec" : "white", color: isSlotExtended(t) ? "#3a5a3a" : "#aaa", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{isSlotExtended(t) ? "✓" : ""} {t}追加</button>
                      ))}
                      {["13:30","14:00","14:30"].map(t => (
                        <button key={t} onClick={() => toggleBreakSlot(t)} style={{ padding: "6px 12px", borderRadius: 8, border: `2px solid ${isSlotBreakReleased(t) ? "#e0a040" : "#e8ddd0"}`, background: isSlotBreakReleased(t) ? "#fdf5f0" : "white", color: isSlotBreakReleased(t) ? "#e0a040" : "#aaa", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{isSlotBreakReleased(t) ? "✓" : ""} {t}解放</button>
                      ))}
                      {["20:00","20:30"].map(t => (
                        <button key={t} onClick={() => toggleSlot(t)} style={{ padding: "6px 12px", borderRadius: 8, border: `2px solid ${isSlotExtended(t) ? "#5a9e7a" : "#e8ddd0"}`, background: isSlotExtended(t) ? "#eaf5ec" : "white", color: isSlotExtended(t) ? "#3a5a3a" : "#aaa", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{isSlotExtended(t) ? "✓" : ""} {t}追加</button>
                      ))}
                    </div>
                  </div>
                </div>
                {loading ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>読み込み中...</div> : (
                  <div style={{ background: "white", borderRadius: 16, overflow: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
                      <thead>
                        <tr style={{ background: "#f5f5f5" }}>
                          <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#7a9a7a", minWidth: 100, position: "sticky", left: 0, background: "#f5f5f5", zIndex: 1 }}>スタッフ</th>
                          {timeSlots.map(time => {
                            const isBreak = BREAK_SLOTS.includes(time);
                            const isExt = ["09:00","09:30","20:00","20:30"].includes(time) && isSlotExtended(time);
                            const breakActive = isBreak && !isSlotBreakReleased(time);
                            return <th key={time} style={{ padding: "6px 4px", textAlign: "center", fontSize: 11, fontWeight: 700, color: breakActive ? "#e0a040" : isExt ? "#5a9e7a" : "#7a9a7a", minWidth: 38, borderLeft: "1px solid #f0ebe4", background: breakActive ? "#fdf5f0" : isExt ? "#f0f8f4" : "#f5f5f5" }}>{time}{breakActive && <div style={{ fontSize: 9, color: "#e0a040" }}>休憩</div>}{isExt && <div style={{ fontSize: 9, color: "#5a9e7a" }}>拡張</div>}</th>;
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {staffList.map(s => (
                          <tr key={s.id} style={{ borderTop: "1px solid #f0ebe4" }}>
                            <td style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, color: isOnShift(s.id) ? "#3a5a3a" : "#ccc", position: "sticky", left: 0, background: "white", zIndex: 1, minWidth: 100 }}>{s.name}{!isOnShift(s.id) && <div style={{ fontSize: 10, color: "#ccc" }}>休み</div>}</td>
                            {(() => {
                              const cells = [];
                              const skipSlots = new Set();
                              timeSlots.forEach(time => {
                                if (skipSlots.has(time)) return;
                                const isBreak = BREAK_SLOTS.includes(time);
                                const booking = getBookingForCell(s.id, time);
                                const blocked = isBlocked(s.id, time);
                                const onShift = isOnShift(s.id);
                                const isExt = ["09:00","09:30","20:00","20:30"].includes(time) && isSlotExtended(time);

                                // 予約の所要時間からcolSpanを計算（横軸＝時間列に展開）
                                let colSpan = 1;
                                if (booking && booking.status !== "cancelled") {
                                  const durationMin = parseInt((booking.course_duration || booking.course_name?.match(/(\d+)分/)?.[1] || "30")) || 30;
                                  colSpan = Math.max(1, Math.round(durationMin / 30));
                                  // colSpanで占有する後続の時間列をスキップ登録
                                  const startIdx = timeSlots.indexOf(time);
                                  for (let i = 1; i < colSpan; i++) {
                                    if (timeSlots[startIdx + i]) skipSlots.add(timeSlots[startIdx + i]);
                                  }
                                }

                                const isDroppable = !!draggedBooking && onShift && !(isBreak && !isSlotBreakReleased(time)) && !(booking && booking.status !== "cancelled") && !blocked && (draggedBooking.isStaged || draggedBooking.id !== (booking?.id));
                                const isDragOver = isDroppable && dragOverCell?.staffId === s.id && dragOverCell?.time === time;
                                const cellBg = isDragOver ? "#d4f0dc" : (BREAK_SLOTS.includes(time) && !isSlotBreakReleased(time)) ? "#fdf5f0" : isExt ? "#f0f8f4" : "white";
                                cells.push(
                                  <td key={time} colSpan={colSpan} draggable={!!(booking && booking.status !== "cancelled")} onDragStart={booking && booking.status !== "cancelled" ? (e => { e.dataTransfer.effectAllowed = 'move'; setDraggedBooking(booking); }) : undefined} onDragEnd={booking && booking.status !== "cancelled" ? (() => { setDraggedBooking(null); setDragOverCell(null); }) : undefined} style={{ padding: "4px", textAlign: "center", borderLeft: "1px solid #f0ebe4", background: cellBg, minWidth: 38, maxWidth: colSpan * 60, width: colSpan * 60, verticalAlign: "top", overflow: "hidden", cursor: booking && booking.status !== "cancelled" ? "grab" : "default" }} onDragOver={isDroppable ? (e => { e.preventDefault(); setDragOverCell({ staffId: s.id, time }); }) : undefined} onDragLeave={isDroppable ? (() => setDragOverCell(null)) : undefined} onDrop={isDroppable ? (e => { e.preventDefault(); dropBooking(s.id, time); }) : undefined}>                                    {isBreak && !isSlotBreakReleased(time) ? <div style={{ fontSize: 11, color: "#e0a040" }}>－</div>
                                    : !onShift ? <div style={{ fontSize: 11, color: "#ddd" }}>－</div>
                                    : booking && booking.status !== "cancelled" ? <div onClick={() => setSelectedBooking(booking)} style={{ background: statusColor(booking.status), color: "white", borderRadius: 6, padding: "4px 4px", fontSize: 11, fontWeight: 600, cursor: "grab", lineHeight: 1.4, minHeight: 30, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "center", opacity: 1 }}><div>{booking.customers?.name || "予約"}</div><div style={{ fontSize: 10, opacity: 0.9 }}>{(booking.course_name || "").slice(0, 6)}</div><div style={{ fontSize: 9, opacity: 0.7 }}>{booking.booking_time}</div></div>                                    : blocked ? (() => { const blk = getBlock(s.id, time); return <div style={{ background: "#e0e0e0", color: "#888", borderRadius: 6, padding: "3px 4px", fontSize: 10, cursor: "pointer", lineHeight: 1.3 }} onClick={() => { if (window.confirm("ブロックを解除しますか？")) toggleBlock(s.id, time); }}><div>🔒</div>{blk?.reason && <div style={{ fontSize: 9, color: "#aaa" }}>{blk.reason.slice(0, 6)}</div>}</div>; })()                                    : <div onClick={() => setBlockModal({ staffId: s.id, time })} style={{ color: "#bbb", fontSize: 18, cursor: "pointer", lineHeight: 1, fontWeight: 300 }}>＋</div>}                                  </td>
                                );
                              });
                              return cells;
                            })()}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {!selectedDate && <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 14 }}>← 日付を選択してください</div>}
            </div>
          </div>
        )}

        {tab === "shifts" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {[{ id: "monthly", label: "📅 月間シフト" }, { id: "templates", label: "📋 テンプレート" }].map(t => (
                <button key={t.id} onClick={() => setShiftSubTab(t.id)} style={{ padding: "10px 20px", borderRadius: 10, border: `2px solid ${shiftSubTab === t.id ? "#5a9e7a" : "#e8ddd0"}`, background: shiftSubTab === t.id ? "#eaf5ec" : "white", color: shiftSubTab === t.id ? "#3a5a3a" : "#aaa", fontSize: 14, fontWeight: shiftSubTab === t.id ? 700 : 400, cursor: "pointer" }}>{t.label}</button>
              ))}
            </div>
            {shiftSubTab === "monthly" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <button onClick={() => setShiftMonth(new Date(shiftMonth.getFullYear(), shiftMonth.getMonth()-1, 1))} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#5a9e7a" }}>‹</button>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>{shiftMonth.getFullYear()}年{shiftMonth.getMonth()+1}月 シフト</div>
                  <button onClick={() => setShiftMonth(new Date(shiftMonth.getFullYear(), shiftMonth.getMonth()+1, 1))} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#5a9e7a" }}>›</button>
                </div>
                <div style={{ fontSize: 12, color: "#aaa", marginBottom: 12 }}>💡 セルをクリックしてシフトを設定できます</div>
                <div style={{ background: "white", borderRadius: 16, overflow: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                      <tr style={{ background: "#f5f5f5" }}>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#7a9a7a", minWidth: 70, position: "sticky", left: 0, background: "#f5f5f5" }}>スタッフ</th>
                        {getDaysInMonth(shiftMonth).filter(d => d).map(d => {
                          const dayIdx = d.getDay();
                          const dateStr = formatDate(d);
                          const closed = isClosedDay(dateStr);
                          return (
                            <th key={dateStr} style={{ padding: "8px 4px", textAlign: "center", fontSize: 11, minWidth: 52, borderLeft: "1px solid #f0ebe4", background: closed ? "#fdf5f0" : "#f5f5f5" }}>
                              <div style={{ color: dayIdx === 0 ? "#e07070" : dayIdx === 6 ? "#7090e0" : "#7a9a7a", fontWeight: 700 }}>{d.getDate()}</div>
                              <div style={{ color: "#aaa", fontSize: 10 }}>{DAYS_JP[dayIdx]}</div>
                              {closed && <div style={{ color: "#e0a040", fontSize: 9 }}>休院</div>}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map(s => (
                        <tr key={s.id} style={{ borderTop: "1px solid #f0ebe4" }}>
                          <td style={{ padding: "10px 16px", fontSize: 12, fontWeight: 700, color: "#3a5a3a", position: "sticky", left: 0, background: "white" }}>{s.name}</td>
                          {getDaysInMonth(shiftMonth).filter(d => d).map(d => {
                            const dateStr = formatDate(d);
                            const shift = getShiftForCell(s.id, dateStr);
                            const closed = isClosedDay(dateStr);
                            const isOpen = popover?.staffId === s.id && popover?.date === dateStr;
                            return (
                              <td key={dateStr} style={{ padding: "4px", textAlign: "center", borderLeft: "1px solid #f0ebe4", background: closed ? "#fdf5f0" : "white", minWidth: 52, position: "relative" }}>
                                <div onClick={() => setPopover(isOpen ? null : { staffId: s.id, staffName: s.name, date: dateStr, shift, closed })} style={{ cursor: "pointer", minHeight: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                  {closed ? <div style={{ fontSize: 12, color: "#ccc" }}>ー</div>
                                  : shift ? <div><div style={{ fontSize: 13, color: "#5a9e7a", fontWeight: 700 }}>〇</div><div style={{ fontSize: 9, color: "#aaa" }}>{shift.start_time?.slice(0,5)}</div><div style={{ fontSize: 9, color: "#aaa" }}>{shift.end_time?.slice(0,5)}</div></div>
                                  : <div style={{ fontSize: 18, color: "#eee" }}>+</div>}
                                </div>
                                {isOpen && <ShiftPopover staffId={s.id} staffName={s.name} date={dateStr} shift={shift} closed={closed} />}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr style={{ borderTop: "2px solid #e8ddd0", background: "#fdf9f4" }}>
                        <td style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#e0a040", position: "sticky", left: 0, background: "#fdf9f4" }}>🏥 休院日</td>
                        {getDaysInMonth(shiftMonth).filter(d => d).map(d => {
                          const dateStr = formatDate(d);
                          const closed = isClosedDay(dateStr);
                          const isOpen = popover?.type === "closed" && popover?.date === dateStr;
                          return (
                            <td key={dateStr} style={{ padding: "4px", textAlign: "center", borderLeft: "1px solid #f0ebe4", background: closed ? "#fdf5f0" : "white", minWidth: 52, position: "relative" }}>
                              <div onClick={() => setPopover(isOpen ? null : { type: "closed", date: dateStr, closed })} style={{ cursor: "pointer", minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <div style={{ fontSize: 14, color: closed ? "#e0a040" : "#ddd", fontWeight: closed ? 700 : 400 }}>{closed ? "ー" : "+"}</div>
                              </div>
                              {isOpen && <ClosedPopover date={dateStr} closed={closed} />}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {shiftSubTab === "templates" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>シフトテンプレート一覧</div>
                  <button onClick={() => { setEditingPlan({}); setNewPlanName(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>＋ 新しいテンプレート</button>
                </div>
                {shiftPlans.length === 0 && <div style={{ textAlign: "center", padding: 40, background: "white", borderRadius: 16, color: "#aaa" }}>テンプレートがまだありません。</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {shiftPlans.map(plan => (
                    <div key={plan.id} style={{ background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>📋 {plan.plan_name}</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => { setApplyPlanModal(plan); setApplyWeekStart(""); setApplyWeekEnd(""); }} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>適用する</button>
                          <button onClick={() => { setEditingPlan(plan); setNewPlanName(plan.plan_name); }} style={{ padding: "8px 16px", borderRadius: 10, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 12, cursor: "pointer" }}>編集</button>
                          <button onClick={() => deletePlan(plan.id)} style={{ padding: "8px 16px", borderRadius: 10, border: "2px solid #ffcccc", background: "white", color: "#e07070", fontSize: 12, cursor: "pointer" }}>削除</button>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {staffList.map(s => {
                          const staffData = plan.plan_data?.[s.id] || {};
                          const workDays = [1,2,3,4,5,6,0].filter(d => staffData[d]?.enabled);
                          return (
                            <div key={s.id} style={{ background: "#f5f5f5", borderRadius: 8, padding: "6px 12px" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#3a5a3a" }}>{s.name}</div>
                              <div style={{ fontSize: 11, color: "#888" }}>{workDays.length > 0 ? workDays.map(d => DAYS_JP[d]).join("・") : "設定なし"}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "bookings" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", marginBottom: 16 }}>予約一覧 - {currentStore.name}</h2>
            <div style={{ marginBottom: 16 }}>
              <input type="date" value={selectedDate ? formatDate(selectedDate) : formatDate(new Date())} onChange={e => { const d = new Date(e.target.value + "T00:00:00"); setSelectedDate(d); fetchBookings(d); }} style={{ padding: "10px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: "#3a5a3a" }} />
            </div>
            {loading ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>読み込み中...</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {bookings.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#aaa", background: "white", borderRadius: 16 }}>予約がありません</div>}
                {bookings.map(b => (
                  <div key={b.id} style={{ background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", cursor: "pointer" }} onClick={() => setSelectedBooking(b)}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#3a5a3a" }}>{b.booking_number}</div>
                        <div style={{ fontSize: 12, background: statusColor(b.status), color: "white", borderRadius: 20, padding: "3px 10px" }}>{statusLabel(b.status)}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "#aaa" }}>{b.booking_date} {b.booking_time}</div>
                    </div>
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                      <div><span style={{ fontSize: 11, color: "#7a9a7a" }}>お名前</span><div style={{ fontSize: 14, color: "#3a5a3a", fontWeight: 600 }}>{b.customers?.name || "未登録"}</div></div>
                      <div><span style={{ fontSize: 11, color: "#7a9a7a" }}>コース</span><div style={{ fontSize: 14, color: "#3a5a3a", fontWeight: 600 }}>{b.course_name}</div></div>
                      <div><span style={{ fontSize: 11, color: "#7a9a7a" }}>担当</span><div style={{ fontSize: 14, color: "#3a5a3a", fontWeight: 600 }}>{b.staff_name}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "notifications" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", margin: 0 }}>🔔 通知送信</h2>
            </div>
            {notifySent && <div style={{ background: "#eaf5ec", border: "1px solid #5a9e7a", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#3a5a3a", fontWeight: 700 }}>✓ 送信完了しました！</div>}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 16 }}>送信先</div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    {[{ id: "all", label: "全顧客" }, { id: "individual", label: "個別指定" }].map(t => (
                      <button key={t.id} onClick={() => { setNotifyTarget(t.id); setNotifyCustomerId(""); setNotifyCustomerResult(null); setNotifyCustomerSearch(""); }}
                        style={{ flex: 1, padding: "10px", borderRadius: 10, border: `2px solid ${notifyTarget === t.id ? "#5a9e7a" : "#e8ddd0"}`, background: notifyTarget === t.id ? "#eaf5ec" : "white", color: notifyTarget === t.id ? "#3a5a3a" : "#888", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {notifyTarget === "individual" && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input value={notifyCustomerSearch} onChange={e => setNotifyCustomerSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchNotifyCustomer(notifyCustomerSearch)}
                          placeholder="名前・電話番号で検索" style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
                        <button onClick={() => searchNotifyCustomer(notifyCustomerSearch)}
                          style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>検索</button>
                      </div>
                      {notifyCustomerResult && notifyCustomerResult.map(c => (
                        <div key={c.id} onClick={() => { setNotifyCustomerId(c.id); setNotifyCustomerResult(null); setNotifyCustomerSearch(c.name); }}
                          style={{ padding: "10px 14px", background: notifyCustomerId === c.id ? "#eaf5ec" : "#f9f6f2", borderRadius: 10, cursor: "pointer", marginBottom: 4, fontSize: 13 }}>
                          {c.name} / {c.tel}
                        </div>
                      ))}
                      {notifyCustomerId && <div style={{ fontSize: 12, color: "#5a9e7a", marginTop: 4 }}>✓ {notifyCustomerSearch} を選択中</div>}
                    </div>
                  )}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>タイトル</label>
                    <input value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)} placeholder="例：次回予約のご案内"
                      style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>本文</label>
                    <textarea value={notifyBody} onChange={e => setNotifyBody(e.target.value)} placeholder="メッセージ内容を入力..." rows={5}
                      style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
                  </div>
                  <button onClick={sendNotification} disabled={notifySending || !notifyTitle || !notifyBody || (notifyTarget === "individual" && !notifyCustomerId)}
                    style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: notifySending || !notifyTitle || !notifyBody ? "#e8ddd0" : "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: notifySending || !notifyTitle || !notifyBody ? "#bbb" : "white", fontSize: 15, fontWeight: 700, cursor: notifySending ? "not-allowed" : "pointer" }}>
                    {notifySending ? "送信中..." : "🔔 送信する"}
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 16 }}>送信履歴</div>
                  {notifications.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 40, color: "#aaa", fontSize: 13 }}>送信履歴がありません</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {notifications.map(n => (
                        <div key={n.id} style={{ padding: "12px 16px", background: "#f9f6f2", borderRadius: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#3a5a3a" }}>{n.title}</div>
                            <div style={{ fontSize: 10, color: "#aaa" }}>{new Date(n.created_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}</div>
                          </div>
                          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{n.body?.slice(0, 50)}{n.body?.length > 50 ? "..." : ""}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>送信方法: {n.sent_via || "-"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "gifts" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", marginBottom: 24 }}>🎫 金券管理</h2>

            {/* 販売履歴 */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>🎫 販売履歴</div>
              <div style={{ background: "white", borderRadius: 16, overflow: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
                      {["顧客番号","顧客名","金券名","枚数","販売日","有効期限","使用状況"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#7a9a7a" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // purchase_group_idでグループ化
                      const purchases = giftHistory.filter(g => g.ticket_type === "purchase");
                      const groups = {};
                      purchases.forEach(g => {
                        const key = g.purchase_group_id || g.id;
                        if (!groups[key]) {
                          groups[key] = { ...g, total: 0, used: 0 };
                        }
                        groups[key].total++;
                        if (g.status === "used") groups[key].used++;
                      });
                      const rows = Object.values(groups);
                      if (rows.length === 0) return <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#aaa" }}>販売履歴がありません</td></tr>;
                      return rows.map((g) => (
                        <tr key={g.id} style={{ borderTop: "1px solid #f0ebe4" }}>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#3a5a3a" }}>{g.customers?.customer_number || "-"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#3a5a3a" }}>{g.customers?.name || "-"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#3a5a3a" }}>{g.ticket_name}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#3a5a3a" }}>{g.total}枚（使用済{g.used}枚）</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#3a5a3a" }}>{g.issued_at}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#3a5a3a" }}>{g.expires_at}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ fontSize: 11, background: g.used === g.total ? "#f0ebe4" : "#eaf5ec", color: g.used === g.total ? "#aaa" : "#5a9e7a", borderRadius: 20, padding: "3px 10px", display: "inline-block" }}>
                              {g.used === g.total ? "全使用済" : `残${g.total - g.used}枚`}
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
            {/* プレゼント履歴 */}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#e0a040", marginBottom: 12 }}>🎁 プレゼント履歴</div>
              <div style={{ background: "white", borderRadius: 16, overflow: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
                      {["顧客番号","顧客名","金券名","枚数","プレゼント日","有効期限","使用状況"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#7a9a7a" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const presents = giftHistory.filter(g => g.ticket_type === "present");
                      const groups = {};
                      presents.forEach(g => {
                        const key = g.purchase_group_id || g.id;
                        if (!groups[key]) groups[key] = { ...g, total: 0, used: 0 };
                        groups[key].total++;
                        if (g.status === "used") groups[key].used++;
                      });
                      const rows = Object.values(groups);
                      if (rows.length === 0) return <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#aaa" }}>プレゼント履歴がありません</td></tr>;
                      return rows.map(g => (
                        <tr key={g.purchase_group_id || g.id} style={{ borderTop: "1px solid #f0ebe4" }}>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#3a5a3a" }}>{g.customers?.customer_number || "-"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#3a5a3a" }}>{g.customers?.name || "-"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#3a5a3a" }}>{g.ticket_name}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#3a5a3a" }}>{g.total}枚（使用済{g.used}枚）</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#3a5a3a" }}>{g.issued_at}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#3a5a3a" }}>{g.expires_at}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ fontSize: 11, background: g.used === g.total ? "#f0ebe4" : "#fdf5e0", color: g.used === g.total ? "#aaa" : "#e0a040", borderRadius: 20, padding: "3px 10px", display: "inline-block" }}>
                              {g.used === g.total ? "全使用済" : `残${g.total - g.used}枚`}
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "customers" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", margin: 0 }}>顧客一覧</h2>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="text" value={customerListSearch} onChange={e => setCustomerListSearch(e.target.value)} placeholder="氏名・電話番号で絞り込み" style={{ padding: "8px 14px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 13, width: 180 }} />
                <select value={customerSortKey} onChange={e => setCustomerSortKey(e.target.value)} style={{ padding: "8px 12px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 13 }}>
                  <option value="customer_number">顧客番号</option>
                  <option value="kana">50音順</option>
                </select>
                <button onClick={() => setCustomerSortOrder(o => o === "asc" ? "desc" : "asc")} style={{ padding: "8px 12px", borderRadius: 10, border: "2px solid #e8ddd0", background: "white", fontSize: 13, cursor: "pointer" }}>
                  {customerSortOrder === "asc" ? "↑ 昇順" : "↓ 降順"}
                </button>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#888", cursor: "pointer" }}>
                <input type="checkbox" checked={showDeleted} onChange={async e => {
                  const val = e.target.checked;
                  setShowDeleted(val);
                  setLoading(true);
                  const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?is_deleted=eq.${val}&order=created_at.desc`, { headers });
                  const data = await res.json();
                  setCustomers(Array.isArray(data) ? data : []);
                  setLoading(false);
                }} />
                非表示顧客を表示
              </label>
              <button onClick={findDuplicates} style={{ padding: "8px 16px", borderRadius: 10, border: "2px solid #e07070", background: "white", color: "#e07070", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🔍 重複検出</button>
            </div>
            {showDuplicates && duplicates.length > 0 && (
              <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e07070" }}>⚠️ 重複が{duplicates.length}件見つかりました</div>
                  <button onClick={() => setShowDuplicates(false)} style={{ padding: "4px 12px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#aaa", fontSize: 12, cursor: "pointer" }}>閉じる</button>
                </div>
                {duplicates.map((group, gi) => (
                  <div key={gi} style={{ background: "#fdf5f0", borderRadius: 12, padding: 16, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: "#e07070", marginBottom: 8 }}>重複グループ {gi + 1}</div>
                    {group.map(c => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0e8d8" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>No.{c.customer_number} / {c.tel} / {c.points}P</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>LINE：{c.line_user_id ? "連携済" : "未連携"}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setMergeTarget(c)} style={{ padding: "6px 12px", borderRadius: 8, border: `2px solid ${mergeTarget?.id === c.id ? "#5a9e7a" : "#e8ddd0"}`, background: mergeTarget?.id === c.id ? "#eaf5ec" : "white", color: mergeTarget?.id === c.id ? "#3a5a3a" : "#888", fontSize: 12, cursor: "pointer" }}>統合先</button>
                          <button onClick={() => setMergeSource(c)} style={{ padding: "6px 12px", borderRadius: 8, border: `2px solid ${mergeSource?.id === c.id ? "#e07070" : "#e8ddd0"}`, background: mergeSource?.id === c.id ? "#fdf0f0" : "white", color: mergeSource?.id === c.id ? "#e07070" : "#888", fontSize: 12, cursor: "pointer" }}>統合元</button>
                        </div>
                      </div>
                    ))}
                    {mergeTarget && mergeSource && group.some(c => c.id === mergeTarget.id) && group.some(c => c.id === mergeSource.id) && (
                      <button onClick={() => mergeCustomers(mergeTarget.id, mergeSource.id)}
                        style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: 10, border: "none", background: "#e07070", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        🔗 「{mergeTarget.name}」に「{mergeSource.name}」を統合する
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {showDuplicates && duplicates.length === 0 && (
              <div style={{ background: "#eaf5ec", borderRadius: 12, padding: 16, marginBottom: 16, textAlign: "center", fontSize: 13, color: "#3a5a3a" }}>✅ 重複は見つかりませんでした</div>
            )}
            {loading ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>読み込み中...</div> : (
              <div style={{ background: "white", borderRadius: 16, overflow: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
                      {["顧客番号","氏名","電話番号","メール","LINE","保有金券"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#7a9a7a" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#aaa" }}>顧客がいません</td></tr>}
                  {customers
                    .filter(c => !customerListSearch || c.name?.includes(customerListSearch) || c.tel?.includes(customerListSearch) || c.kana?.includes(customerListSearch))
                    .sort((a, b) => {
                      const aVal = customerSortKey === "customer_number" ? (parseInt(a.customer_number) || 99999) : (a.kana || a.name || "");
                      const bVal = customerSortKey === "customer_number" ? (parseInt(b.customer_number) || 99999) : (b.kana || b.name || "");
                      if (aVal < bVal) return customerSortOrder === "asc" ? -1 : 1;
                      if (aVal > bVal) return customerSortOrder === "asc" ? 1 : -1;
                      return 0;
                    })
                    .map((c, i) => {
                      const tkt = allCustomerTickets[c.id] || { purchase: 0, present: 0 };
                      return (
                        <tr key={c.id} style={{ borderTop: "1px solid #f0ebe4", cursor: "pointer" }} onClick={() => { setSelectedCustomer(c); fetchCustomerDetail(c.id); fetchCustomerHistory(c.id); fetchCustomerTickets(c.id); }}>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "#3a5a3a" }}>{c.customer_number || i+1}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#5a9e7a" }}>{c.name}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "#3a5a3a" }}>{c.tel}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "#3a5a3a" }}>{c.email}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: c.line_user_id ? "#5a9e7a" : "#ccc" }}>{c.line_user_id ? "✓ 連携済" : "未連携"}</td>
                          <td style={{ padding: "8px 16px", fontSize: 12, color: "#3a5a3a" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              <button onClick={() => setEditTicketModal({ customer: c, type: "purchase", count: tkt.purchase, date: formatDate(new Date()) })}
                                style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid #b0d8b8", background: tkt.purchase > 0 ? "#eaf5ec" : "#f5f5f5", color: tkt.purchase > 0 ? "#3a7a5a" : "#aaa", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                A:{tkt.purchase}
                              </button>
                              <button onClick={() => setEditTicketModal({ customer: c, type: "present", count: tkt.present, date: formatDate(new Date()) })}
                                style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid #f0c8a0", background: tkt.present > 0 ? "#fff5ee" : "#f5f5f5", color: tkt.present > 0 ? "#c06020" : "#aaa", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                B:{tkt.present}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
