"use client";
import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";

const STORES = [
  { id: "minamiurawa", name: "南浦和店" },
  { id: "toda", name: "戸田店" },
];

const ADMIN_USERS = [
  { id: "minamiurawa", name: "南浦和店", password: "yurari-minami" },
  { id: "toda", name: "戸田店", password: "yurari-toda" },
];

const PAYMENT_METHODS = [
  { id: "cash", name: "現金", icon: "💴" },
  { id: "card", name: "カード", icon: "💳" },
  { id: "paypay", name: "PayPay", icon: "📱" },
  { id: "linepay", name: "LINE Pay", icon: "💚" },
  { id: "other", name: "その他", icon: "💰" },
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
  const [applyWeekStart, setApplyWeekStart] = useState("");
  const [applyWeekEnd, setApplyWeekEnd] = useState("");
  const [products, setProducts] = useState([]);
  const [checkoutBooking, setCheckoutBooking] = useState(null);
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [checkoutDiscount, setCheckoutDiscount] = useState(0);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState("cash");
  const [checkoutNote, setCheckoutNote] = useState("");
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [todayBookings, setTodayBookings] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [courseMenus, setCourseMenus] = useState([]);
  const [settingsSubTab, setSettingsSubTab] = useState("staff");
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [leadTime, setLeadTime] = useState(60);
  const [giftTicketTemplates, setGiftTicketTemplates] = useState([]);
  const [customerTickets, setCustomerTickets] = useState([]);
  const [editingTicketTemplate, setEditingTicketTemplate] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [directBookingModal, setDirectBookingModal] = useState(null);
  const [directBookingForm, setDirectBookingForm] = useState({});
  const [customerSearchResult, setCustomerSearchResult] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [giftModal, setGiftModal] = useState(null); // { customer, mode: 'sell' or 'present' }
  const [giftForm, setGiftForm] = useState({});
  const [giftCustomerSearch, setGiftCustomerSearch] = useState("");
  const [giftCustomerResult, setGiftCustomerResult] = useState(null);
  const [giftSelectedCustomer, setGiftSelectedCustomer] = useState(null);
  const [giftSaving, setGiftSaving] = useState(false);
  const [giftDone, setGiftDone] = useState(false);
  const [notifyTarget, setNotifyTarget] = useState("all"); // all / individual
  const [notifyCustomerId, setNotifyCustomerId] = useState("");
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");
  const [notifySending, setNotifySending] = useState(false);
  const [notifySent, setNotifySent] = useState(false);
  const [notifyCustomerSearch, setNotifyCustomerSearch] = useState("");
  const [notifyCustomerResult, setNotifyCustomerResult] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const popoverRef = useRef(null);

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  const handleLogin = () => {
    const user = ADMIN_USERS.find(u => u.id === selectedStore && u.password === password);
    if (user) { setLoggedIn(true); setCurrentStore(user); setError(""); }
    else setError("パスワードが違います");
  };

  const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const formatPrice = (p) => `¥${p.toLocaleString()}`;

  const fetchBookings = async (date) => {
    if (!date) return;
    setLoading(true);
    const d = formatDate(date);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?store_id=eq.${currentStore.id}&booking_date=eq.${d}&select=*,customers(name,tel,kana,email,line_user_id)`, { headers });
    const data = await res.json();
    setBookings(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const fetchTodayBookings = async (dateStr) => {
    const d = dateStr || formatDate(new Date());
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?store_id=eq.${currentStore.id}&booking_date=eq.${d}&select=*,customers(name,tel)&order=booking_time.asc`, { headers });
    const data = await res.json();
    setTodayBookings(Array.isArray(data) ? data : []);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?order=created_at.desc`, { headers });
    const data = await res.json();
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const fetchCustomerHistory = async (customerId) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?customer_id=eq.${customerId}&order=booking_date.desc&select=*`, { headers });
    const data = await res.json();
    setCustomerHistory(Array.isArray(data) ? data : []);
  };

  const fetchBlocks = async (date) => {
    if (!date) return;
    const d = formatDate(date);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blocks?store_id=eq.${currentStore.id}&block_date=eq.${d}`, { headers });
    const data = await res.json();
    setBlocks(Array.isArray(data) ? data : []);
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
    setCheckoutDiscount(prev => prev + use);
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
  };

  const searchCustomerByNumber = async (num) => {
    if (!num) { setCustomerSearchResult(null); return; }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?customer_number=eq.${num}`, { headers });
    const data = await res.json();
    if (data[0]) {
      setCustomerSearchResult(data[0]);
      setDirectBookingForm(f => ({ ...f, customer_id: data[0].id, customer_name: data[0].name, customer_kana: data[0].kana || "", tel: data[0].tel || "" }));
    } else {
      setCustomerSearchResult(null);
      setDirectBookingForm(f => ({ ...f, customer_id: null, customer_name: "", customer_kana: "", tel: "" }));
    }
  };

  const saveDirectBooking = async () => {
    const f = directBookingForm;
    if (!f.customer_name || !f.course_id) return;
    let customerId = f.customer_id;
    if (!customerId && f.customer_name) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
        method: "POST", headers,
        body: JSON.stringify({ name: f.customer_name, kana: f.customer_kana || "", tel: f.tel || "", email: f.email || "" }),
      });
      const data = await res.json();
      customerId = data[0]?.id;
    }
    const course = courseMenus.find(c => c.id === f.course_id);
    const staff = staffMembers.find(s => s.id === f.staff_id);
    const bookingDate = formatDate(directBookingModal.date);
    const num = `YR-${Date.now().toString().slice(-8)}`;
    await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: "POST", headers,
      body: JSON.stringify({
        store_id: currentStore.id,
        customer_id: customerId || null,
        staff_id: f.staff_id,
        course_id: f.course_id,
        booking_date: bookingDate,
        booking_time: f.booking_time,
        course_name: course?.name || "",
        staff_name: staff?.name || "",
        status: "confirmed",
        notes: f.notes || "",
        booking_number: num,
        source: "direct",
      }),
    });
    setDirectBookingModal(null);
    setDirectBookingForm({});
    setCustomerSearchResult(null);
    setCustomerSearchQuery("");
    fetchAll(directBookingModal.date);
  };

  const searchGiftCustomer = async (query) => {
    if (!query) { setGiftCustomerResult(null); return; }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?or=(name.ilike.*${query}*,tel.ilike.*${query}*)&select=id,name,tel,email&limit=5`, { headers });
    const data = await res.json();
    setGiftCustomerResult(Array.isArray(data) ? data : []);
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
            purchase_group_id: giftModal.mode === 'sell' ? groupId : null,
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
        const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${notifyCustomerId}&select=id,name,email,notification_method`, { headers });
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
        // メール送信

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

  const fetchAll = async (date) => {
    await Promise.all([fetchBookings(date), fetchBlocks(date), fetchShifts(date), fetchExtensions(date)]);
  };

  useEffect(() => {
    if (loggedIn && tab === "customers") fetchCustomers();
    if (loggedIn && tab === "shifts") { fetchMonthShifts(); fetchShiftPlans(); fetchStaffMembers(); }
    if (loggedIn && tab === "checkout") { fetchTodayBookings(); fetchProducts(); fetchCourseMenus(); fetchGiftTicketTemplates(); }
    if (loggedIn && tab === "settings") { fetchStaffMembers(); fetchCourseMenus(); fetchProducts(); fetchStoreSettings(); fetchGiftTicketTemplates(); }
    if (loggedIn && tab === "calendar") { fetchStaffMembers(); }
    if (loggedIn && tab === "bookings") { fetchBookings(selectedDate || new Date()); }
    if (loggedIn && tab === "notifications") { fetchNotifications(); fetchCustomers(); }
    if (loggedIn && tab === "gifts") { fetchGiftTicketTemplates(); }
  }, [loggedIn, tab]);

  useEffect(() => {
    if (loggedIn && selectedDate) fetchAll(selectedDate);
  }, [selectedDate]);

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
      await fetch(`${SUPABASE_URL}/rest/v1/course_menus?id=eq.${editingCourse.id}`, { method: "PATCH", headers, body: JSON.stringify({ name: editingCourse.name, duration: editingCourse.duration, price: parseInt(editingCourse.price), description: editingCourse.description, is_active: editingCourse.is_active, is_first_only: editingCourse.is_first_only }) });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/course_menus`, { method: "POST", headers, body: JSON.stringify({ name: editingCourse.name, duration: editingCourse.duration, price: parseInt(editingCourse.price), description: editingCourse.description, is_active: true, is_first_only: editingCourse.is_first_only || false, sort_order: courseMenus.length + 1 }) });
    }
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

  const startCheckout = (booking) => {
    const course = courseMenus.find(c => c.id === booking.course_id) || { name: booking.course_name, price: 0 };
    setCheckoutBooking(booking);
    setCheckoutItems([{ type: "course", name: course.name, price: course.price || 0, quantity: 1 }]);
    setCheckoutDiscount(0);
    setCheckoutPaymentMethod("cash");
    setCheckoutNote("");
    setCheckoutComplete(false);
    setCheckoutResult(null);
    setSelectedTicket(null);
    setCustomerTickets([]);
    if (booking.customer_id) fetchCustomerTicketCount(booking.customer_id);
  };

  const addProduct = (product) => {
    const existing = checkoutItems.find(i => i.id === product.id);
    if (existing) {
      setCheckoutItems(checkoutItems.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCheckoutItems([...checkoutItems, { id: product.id, type: "product", name: product.name, price: product.price, quantity: 1 }]);
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
      body: JSON.stringify({ store_id: currentStore.id, customer_id: checkoutBooking?.customer_id || null, booking_id: checkoutBooking?.id || null, subtotal, discount: checkoutDiscount, total, payment_method: checkoutPaymentMethod, payment_status: "paid", notes: checkoutNote }),
    });
    const paymentData = await paymentRes.json();
    const paymentId = paymentData[0]?.id;
    if (paymentId) {
      for (const item of checkoutItems) {
        await fetch(`${SUPABASE_URL}/rest/v1/payment_items`, { method: "POST", headers, body: JSON.stringify({ payment_id: paymentId, item_type: item.type, item_name: item.name, price: item.price, quantity: item.quantity }) });
      }
    }
    if (checkoutBooking) {
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${checkoutBooking.id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "completed" }) });
    }
    setCheckoutResult({ paymentId, total, paymentMethod: checkoutPaymentMethod, customerName: checkoutBooking?.customers?.name || "お客様" });
    setCheckoutComplete(true);
    fetchTodayBookings();
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
        if (dayData?.enabled) await saveShift(staffId, dateStr, dayData.start || "10:00", dayData.end || "19:00", "出勤");
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

  const toggleBlock = async (staffId, time) => {
    const d = formatDate(selectedDate);
    const existing = blocks.find(b => b.staff_id === staffId && b.block_time === time);
    if (existing) {
      await fetch(`${SUPABASE_URL}/rest/v1/blocks?id=eq.${existing.id}`, { method: "DELETE", headers });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/blocks`, { method: "POST", headers, body: JSON.stringify({ store_id: currentStore.id, staff_id: staffId, block_date: d, block_time: time, block_type: "staff" }) });
    }
    fetchBlocks(selectedDate);
  };

  const updateBookingStatus = async (id, status) => {
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify({ status }) });
    
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
    if (ext) {
      await fetch(`${SUPABASE_URL}/rest/v1/time_extensions?id=eq.${ext.id}`, { method: "PATCH", headers, body: JSON.stringify({ [field]: !currentVal }) });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/time_extensions`, { method: "POST", headers, body: JSON.stringify({ store_id: currentStore.id, extension_date: d, [field]: true }) });
    }
    fetchExtensions(selectedDate);
  };

  const getBookingForCell = (staffId, time) => bookings.find(b => b.staff_id === staffId && b.booking_time === time);
  const isBlocked = (staffId, time) => blocks.some(b => (b.staff_id === staffId || b.staff_id === "all") && b.block_time === time);
  const isOnShift = (staffId) => { if (shifts.length === 0) return true; return shifts.some(s => s.staff_id === staffId); };
  const staffList = staffMembers.filter(s => s.is_active);

  const ShiftPopover = ({ staffId, staffName, date, shift, closed }) => {
    const [startTime, setStartTime] = useState(shift?.start_time?.slice(0,5) || "10:00");
    const [endTime, setEndTime] = useState(shift?.end_time?.slice(0,5) || "19:00");
    const [showTime, setShowTime] = useState(!!shift);
    return (
      <div ref={popoverRef} style={{ position: "absolute", zIndex: 100, background: "white", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", padding: 16, minWidth: 220, top: "100%", left: 0 }} onClick={e => e.stopPropagation()}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setDirectBookingModal(null)}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>📝 直接予約入力</div>
              <button onClick={() => setDirectBookingModal(null)} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#aaa" }}>×</button>
            </div>
            <div style={{ background: "#f9f6f2", borderRadius: 12, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: "#7a9a7a" }}>
              📅 {directBookingModal.date.getMonth()+1}月{directBookingModal.date.getDate()}日　⏰ {directBookingModal.time}　👤 {staffMembers.find(s => s.id === directBookingModal.staffId)?.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>顧客番号で検索</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" inputMode="numeric" value={customerSearchQuery} onChange={e => setCustomerSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && searchCustomerByNumber(customerSearchQuery)} placeholder="例：1001" style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
                  <button onClick={() => searchCustomerByNumber(customerSearchQuery)} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>検索</button>
                </div>
                {customerSearchResult && <div style={{ marginTop: 8, padding: "10px 14px", background: "#eaf5ec", borderRadius: 10, fontSize: 13, color: "#3a5a3a" }}>✓ {customerSearchResult.name}（{customerSearchResult.kana}）{customerSearchResult.tel}</div>}
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
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>コース <span style={{ color: "#e07070" }}>*</span></label>
                <select value={directBookingForm.course_id || ""} onChange={e => setDirectBookingForm(f => ({ ...f, course_id: e.target.value }))} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box", background: "white" }}>
                  <option value="">選択してください</option>
                  {courseMenus.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}（{c.duration} / ¥{c.price?.toLocaleString()}）</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>メモ</label>
                <input value={directBookingForm.notes || ""} onChange={e => setDirectBookingForm(f => ({ ...f, notes: e.target.value }))} placeholder="施術メモ・来院理由など" style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={() => setDirectBookingModal(null)} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>キャンセル</button>
              <button onClick={saveDirectBooking} disabled={!directBookingForm.customer_name || !directBookingForm.course_id} style={{ flex: 2, padding: "14px", borderRadius: 14, border: "none", background: directBookingForm.customer_name && directBookingForm.course_id ? "linear-gradient(135deg, #5a9e7a, #3a7a5a)" : "#e8ddd0", color: directBookingForm.customer_name && directBookingForm.course_id ? "white" : "#bbb", fontSize: 15, fontWeight: 700, cursor: directBookingForm.customer_name && directBookingForm.course_id ? "pointer" : "not-allowed" }}>予約を登録する</button>
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
                { label: "予約番号", value: selectedBooking.booking_number },
                { label: "日時", value: `${selectedBooking.booking_date} ${selectedBooking.booking_time}` },
                { label: "コース", value: selectedBooking.course_name },
                { label: "担当", value: selectedBooking.staff_name },
                { label: "お名前", value: selectedBooking.customers?.name || "未登録" },
                { label: "電話番号", value: selectedBooking.customers?.tel || "-" },
                { label: "メール", value: selectedBooking.customers?.email || "-" },
                { label: "LINE", value: selectedBooking.customers?.line_user_id ? "連携済" : "未連携" },
                { label: "メモ", value: selectedBooking.notes || "-" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", borderBottom: "1px solid #f0ebe4", paddingBottom: 8 }}>
                  <div style={{ fontSize: 12, color: "#7a9a7a", fontWeight: 700, width: 80, flexShrink: 0 }}>{row.label}</div>
                  <div style={{ fontSize: 13, color: "#3a5a3a" }}>{row.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
  {["confirmed","received","treatment_done","cancelled"].map(s => (
    <button key={s} onClick={async () => {
      await updateBookingStatus(selectedBooking.id, s);
      if (s === 'received' && selectedBooking.customer_id) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${selectedBooking.customer_id}`, { headers });
        const data = await res.json();
        if (data[0]?.customer_number) {
          alert(`受付完了！顧客番号：${data[0].customer_number}`);
        }
      }
    }}
    disabled={selectedBooking.status === 'received' && s === 'received'}
    style={{ flex: 1, padding: "10px", borderRadius: 10, border: `2px solid ${statusColor(s)}`, background: selectedBooking.status === s ? statusColor(s) : "white", color: selectedBooking.status === s ? "white" : statusColor(s), fontSize: 11, fontWeight: 600, cursor: selectedBooking.status === 'received' && s === 'received' ? "not-allowed" : "pointer", opacity: selectedBooking.status === 'received' && s === 'received' ? 0.5 : 1 }}>
      {statusLabel(s)}
    </button>
  ))}
</div>

    {selectedCustomer && (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => { setSelectedCustomer(null); setEditingCustomer(null); }}>
    <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>{selectedCustomer.name} 様</div>
        <div style={{ display: "flex", gap: 8 }}>
          {!editingCustomer && (
            <button onClick={() => setEditingCustomer({ ...selectedCustomer })} style={{ padding: "6px 16px", borderRadius: 8, border: "2px solid #5a9e7a", background: "white", color: "#5a9e7a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>編集</button>
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
            { label: "生年月日", key: "birthday", type: "date" },
            { label: "郵便番号", key: "zipcode" },
            { label: "住所", key: "address" },
            { label: "電話番号1", key: "tel" },
            { label: "電話番号2", key: "tel2" },
            { label: "メールアドレス", key: "email" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 4 }}>{f.label}</label>
              <input
                type={f.type || "text"}
                value={editingCustomer[f.key] || ""}
                onChange={e => setEditingCustomer({ ...editingCustomer, [f.key]: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 4 }}>通知方法</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["line", "email", "sms"].map(m => (
                <button key={m} onClick={() => setEditingCustomer({ ...editingCustomer, notification_method: m })}
                  style={{ flex: 1, padding: "8px", borderRadius: 8, border: `2px solid ${editingCustomer.notification_method === m ? "#5a9e7a" : "#e8ddd0"}`, background: editingCustomer.notification_method === m ? "#eaf5ec" : "white", color: editingCustomer.notification_method === m ? "#3a5a3a" : "#aaa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {m === "line" ? "LINE" : m === "email" ? "メール" : "SMS"}
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
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", borderBottom: "1px solid #f0ebe4", paddingBottom: 6 }}>
              <div style={{ fontSize: 12, color: "#7a9a7a", fontWeight: 700, width: 90, flexShrink: 0 }}>{row.label}</div>
              <div style={{ fontSize: 13, color: "#3a5a3a" }}>{row.value || "-"}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>来院履歴（{customerHistory.length}件）</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {customerHistory.length === 0 && <div style={{ color: "#aaa", fontSize: 13 }}>来院履歴がありません</div>}
        {customerHistory.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#f5f5f5", borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#3a5a3a" }}>{b.booking_date} {b.booking_time}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{b.course_name} / {b.staff_name}</div>
            </div>
            <div style={{ fontSize: 11, background: statusColor(b.status), color: "white", borderRadius: 20, padding: "3px 10px" }}>{statusLabel(b.status)}</div>
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
                            <input type="time" value={dayData.end || "19:00"} onChange={e => updatePlanData(s.id, dayOfWeek, "end", e.target.value)} style={{ padding: "4px 8px", borderRadius: 8, border: "2px solid #e8ddd0", fontSize: 12, width: 90 }} />
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
              <input type="date" value={applyWeekStart} onChange={e => setApplyWeekStart(e.target.value)} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
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
        <button onClick={() => { setLoggedIn(false); setPassword(""); }} style={{ padding: "8px 16px", borderRadius: 10, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 13, cursor: "pointer" }}>ログアウト</button>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #e8ddd0", background: "white", padding: "0 24px", overflowX: "auto" }}>
        {[
          { id: "calendar", label: "📅 カレンダー" },
          { id: "bookings", label: "📋 予約一覧" },
          { id: "checkout", label: "💴 会計" },
          { id: "shifts", label: "👤 シフト管理" },
          { id: "customers", label: "👥 顧客管理" },
          { id: "notifications", label: "🔔 通知" },
          { id: "gifts", label: "🎫 金券管理" },
          { id: "settings", label: "⚙️ 設定" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "14px 20px", border: "none", background: "none", fontSize: 14, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#3a5a3a" : "#aaa", borderBottom: tab === t.id ? "3px solid #5a9e7a" : "3px solid transparent", cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>

        {tab === "settings" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {[
                { id: "staff", label: "👤 スタッフ管理" },
                { id: "courses", label: "📋 メニュー管理" },
                { id: "products", label: "🛍️ 物販商品管理" },
                { id: "booking", label: "⏰ 予約設定" },
                { id: "tickets", label: "🎫 金券管理" },
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

            {settingsSubTab === "courses" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>メニュー一覧</div>
                  <button onClick={() => setEditingCourse({})} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>＋ コース追加</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {courseMenus.length === 0 && <div style={{ textAlign: "center", padding: 40, background: "white", borderRadius: 16, color: "#aaa" }}>コースが登録されていません</div>}
                  {courseMenus.map((c, idx) => (
                    <div key={c.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: c.is_active ? "#3a5a3a" : "#aaa" }}>{c.name}</div>
                          {c.is_first_only && <div style={{ fontSize: 10, background: "#ff8c69", color: "white", borderRadius: 10, padding: "2px 8px" }}>初回限定</div>}
                          {!c.is_active && <div style={{ fontSize: 10, background: "#f0ebe4", color: "#aaa", borderRadius: 10, padding: "2px 8px" }}>非公開</div>}
                        </div>
                        <div style={{ fontSize: 12, color: "#888" }}>{c.duration} / ¥{c.price?.toLocaleString()}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={async () => { if (idx > 0) { await fetch(`${SUPABASE_URL}/rest/v1/course_menus?id=eq.${c.id}`, { method: "PATCH", headers, body: JSON.stringify({ sort_order: courseMenus[idx-1].sort_order }) }); await fetch(`${SUPABASE_URL}/rest/v1/course_menus?id=eq.${courseMenus[idx-1].id}`, { method: "PATCH", headers, body: JSON.stringify({ sort_order: c.sort_order }) }); fetchCourseMenus(); } }} style={{ padding: "6px 10px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, cursor: "pointer" }}>↑</button>
                        <button onClick={async () => { if (idx < courseMenus.length - 1) { await fetch(`${SUPABASE_URL}/rest/v1/course_menus?id=eq.${c.id}`, { method: "PATCH", headers, body: JSON.stringify({ sort_order: courseMenus[idx+1].sort_order }) }); await fetch(`${SUPABASE_URL}/rest/v1/course_menus?id=eq.${courseMenus[idx+1].id}`, { method: "PATCH", headers, body: JSON.stringify({ sort_order: c.sort_order }) }); fetchCourseMenus(); } }} style={{ padding: "6px 10px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, cursor: "pointer" }}>↓</button>
                        <button onClick={() => setEditingCourse(c)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 12, cursor: "pointer" }}>編集</button>
                        <button onClick={() => deleteCourse(c.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #ffcccc", background: "white", color: "#e07070", fontSize: 12, cursor: "pointer" }}>削除</button>
                      </div>
                    </div>
                  ))}
                </div>
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
          </div>
        )}

        {tab === "checkout" && (
          <div>
            {!checkoutBooking ? (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", marginBottom: 8 }}>会計</h2>
                <div style={{ marginBottom: 16 }}>
                  <input type="date" defaultValue={formatDate(new Date())} onChange={e => fetchTodayBookings(e.target.value)} style={{ padding: "10px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: "#3a5a3a" }} />
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
              </div>
            ) : checkoutComplete ? (
              <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", paddingTop: 40 }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#3a5a3a", marginBottom: 8 }}>会計完了！</div>
                <div style={{ fontSize: 14, color: "#7a9a7a", marginBottom: 32 }}>{checkoutResult?.customerName} 様</div>
                <div style={{ background: "linear-gradient(135deg, #eaf5ec, #e0f0e8)", borderRadius: 16, padding: "24px", marginBottom: 24 }}>
                  <div style={{ fontSize: 13, color: "#7a9a7a", marginBottom: 4 }}>お支払い金額</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#3a5a3a" }}>{formatPrice(checkoutResult?.total || 0)}</div>
                  <div style={{ fontSize: 13, color: "#7a9a7a", marginTop: 8 }}>{PAYMENT_METHODS.find(m => m.id === checkoutResult?.paymentMethod)?.name}</div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => { setCheckoutBooking(null); setCheckoutComplete(false); }} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "2px solid #5a9e7a", background: "white", color: "#5a9e7a", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>戻る</button>
                  <button onClick={() => window.print()} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>🖨️ 領収書印刷</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 300 }}>
                  <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a", marginBottom: 16 }}>{checkoutBooking.customers?.name || "お客様"} 様の会計</div>
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
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "2px solid #e8ddd0" }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>合計</span>
                        <span style={{ fontSize: 20, fontWeight: 700, color: "#5a9e7a" }}>{formatPrice(total)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>支払い方法</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {PAYMENT_METHODS.map(m => (
                        <button key={m.id} onClick={() => setCheckoutPaymentMethod(m.id)} style={{ padding: "10px 16px", borderRadius: 10, border: `2px solid ${checkoutPaymentMethod === m.id ? "#5a9e7a" : "#e8ddd0"}`, background: checkoutPaymentMethod === m.id ? "#eaf5ec" : "white", color: checkoutPaymentMethod === m.id ? "#3a5a3a" : "#888", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{m.icon} {m.name}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={() => setCheckoutBooking(null)} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>戻る</button>
                    <button onClick={savePayment} style={{ flex: 2, padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>✓ 会計を確定する</button>
                  </div>
                </div>
                <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>物販を追加</div>
                    {products.filter(p => p.is_active).length === 0 ? (
                      <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 20 }}>商品が登録されていません</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {products.filter(p => p.is_active).map(p => (
                          <div key={p.id} onClick={() => addProduct(p)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#f9f6f2", borderRadius: 10, cursor: "pointer" }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#3a5a3a" }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: "#aaa" }}>{p.category}</div>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#5a9e7a" }}>{formatPrice(p.price)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>🎫 金券</div>
                    {checkoutBooking?.customer_id ? (
                      <>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", marginBottom: 8 }}>保有枚数</div>
                          {customerTickets.length === 0 ? (
                            <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: 12 }}>金券がありません</div>
                          ) : (
                            <>
                              <div style={{ background: "#f0f8f4", borderRadius: 12, padding: "12px 16px", marginBottom: 8 }}>
                                <div style={{ fontSize: 24, fontWeight: 700, color: "#3a5a3a" }}>{customerTickets.length}枚</div>
                                <div style={{ fontSize: 11, color: "#888" }}>有効期限が近い順に使用されます</div>
                                <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>最短期限: {customerTickets[0]?.expires_at}</div>
                              </div>
                              <button onClick={async () => {
                                const used = await useGiftTicketByCount(checkoutBooking.customer_id);
                                if (used) {
                                  setSelectedTicket(used);
                                  setCheckoutDiscount(prev => prev + used.face_value);
                                  await fetchCustomerTicketCount(checkoutBooking.customer_id);
                                }
                              }} disabled={!!selectedTicket} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: selectedTicket ? "#aaa" : "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: selectedTicket ? "not-allowed" : "pointer" }}>
                                {selectedTicket ? `✓ 1枚使用済（-¥${selectedTicket.face_value?.toLocaleString()}）` : "1枚使用する（-¥1,000）"}
                              </button>
                            </>
                          )}
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

        {tab === "calendar" && (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", minWidth: 320 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1, 1))} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#5a9e7a" }}>‹</button>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>{currentMonth.getFullYear()}年{currentMonth.getMonth()+1}月</div>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 1))} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#5a9e7a" }}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                {DAYS_JP.map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#aaa", padding: "4px 0" }}>{d}</div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {getDaysInMonth(currentMonth).map((d, i) => {
                  if (!d) return <div key={i} />;
                  const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString();
                  const isToday = d.toDateString() === new Date().toDateString();
                  const dayIdx = d.getDay();
                  return (
                    <div key={i} onClick={() => setSelectedDate(d)} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, cursor: "pointer", background: isSelected ? "#3a5a3a" : isToday ? "#eaf5ec" : "white", color: isSelected ? "white" : dayIdx === 0 ? "#e07070" : dayIdx === 6 ? "#7090e0" : "#3a5a3a", fontWeight: isToday ? 700 : 400, fontSize: 13, border: isToday && !isSelected ? "2px solid #5a9e7a" : "2px solid transparent" }}>
                      {d.getDate()}
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
                            return <th key={time} style={{ padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 700, color: breakActive ? "#e0a040" : isExt ? "#5a9e7a" : "#7a9a7a", minWidth: 70, borderLeft: "1px solid #f0ebe4", background: breakActive ? "#fdf5f0" : isExt ? "#f0f8f4" : "#f5f5f5" }}>{time}{breakActive && <div style={{ fontSize: 9, color: "#e0a040" }}>休憩</div>}{isExt && <div style={{ fontSize: 9, color: "#5a9e7a" }}>拡張</div>}</th>;
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {staffList.map(s => (
                          <tr key={s.id} style={{ borderTop: "1px solid #f0ebe4" }}>
                            <td style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, color: isOnShift(s.id) ? "#3a5a3a" : "#ccc", position: "sticky", left: 0, background: "white", zIndex: 1, minWidth: 100 }}>{s.name}{!isOnShift(s.id) && <div style={{ fontSize: 10, color: "#ccc" }}>休み</div>}</td>
                            {timeSlots.map(time => {
                              const isBreak = BREAK_SLOTS.includes(time);
                              const booking = getBookingForCell(s.id, time);
                              const blocked = isBlocked(s.id, time);
                              const onShift = isOnShift(s.id);
                              const isExt = ["09:00","09:30","20:00","20:30"].includes(time) && isSlotExtended(time);
                              return (
                                <td key={time} style={{ padding: "4px", textAlign: "center", borderLeft: "1px solid #f0ebe4", background: (BREAK_SLOTS.includes(time) && !isSlotBreakReleased(time)) ? "#fdf5f0" : isExt ? "#f0f8f4" : "white", minWidth: 70 }}>
                                  {isBreak && !isSlotBreakReleased(time) ? <div style={{ fontSize: 11, color: "#e0a040" }}>－</div>
                                  : !onShift ? <div style={{ fontSize: 11, color: "#ddd" }}>－</div>
                                  : booking && booking.status !== "cancelled" ? <div style={{ background: statusColor(booking.status), color: "white", borderRadius: 6, padding: "3px 6px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => setSelectedBooking(booking)}>{booking.customers?.name || "予約あり"}</div>
                                  : blocked ? <div onClick={() => toggleBlock(s.id, time)} style={{ background: "#f0ebe4", color: "#bbb", borderRadius: 6, padding: "3px 6px", fontSize: 10, cursor: "pointer" }}>🔒</div>
                                  : <div onClick={() => { setDirectBookingModal({ date: selectedDate, staffId: s.id, time }); setDirectBookingForm({ staff_id: s.id, booking_time: time }); setCustomerSearchQuery(""); setCustomerSearchResult(null); fetchCourseMenus(); }} style={{ color: "#bbb", fontSize: 18, cursor: "pointer", lineHeight: 1, fontWeight: 300 }}>＋</div>}
                                </td>
                              );
                            })}
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
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#7a9a7a", minWidth: 100, position: "sticky", left: 0, background: "#f5f5f5" }}>スタッフ</th>
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
                            <div style={{ fontSize: 10, color: "#aaa" }}>{new Date(n.created_at).toLocaleDateString("ja-JP")}</div>
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
            {giftModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setGiftModal(null)}>
                <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>{giftModal.mode === 'sell' ? "🎫 金券販売" : "🎁 金券プレゼント"}</div>
                    <button onClick={() => setGiftModal(null)} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#aaa" }}>×</button>
                  </div>
                  {giftDone ? (
                    <div style={{ textAlign: "center", padding: 40 }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>発行完了しました！</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>顧客検索</label>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          <input value={giftCustomerSearch} onChange={e => setGiftCustomerSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchGiftCustomer(giftCustomerSearch)}
                            placeholder="名前・電話番号で検索" style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
                          <button onClick={() => searchGiftCustomer(giftCustomerSearch)}
                            style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>検索</button>
                        </div>
                        {giftCustomerResult && giftCustomerResult.map(c => (
                          <div key={c.id} onClick={() => { setGiftSelectedCustomer(c); setGiftCustomerResult(null); setGiftCustomerSearch(c.name); }}
                            style={{ padding: "10px 14px", background: "#f9f6f2", borderRadius: 10, cursor: "pointer", marginBottom: 4, fontSize: 13 }}>
                            {c.name} / {c.tel}
                          </div>
                        ))}
                        {giftSelectedCustomer && <div style={{ fontSize: 12, color: "#5a9e7a", marginTop: 4 }}>✓ {giftSelectedCustomer.name} を選択中</div>}
                      </div>
                      <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>金券種類</label>
                        <select value={giftForm.templateId || ""} onChange={e => setGiftForm({ ...giftForm, templateId: e.target.value })}
                          style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, background: "white", boxSizing: "border-box" }}>
                          <option value="">選択してください</option>
                          {giftTicketTemplates.filter(t => t.is_active).map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name}（¥{t.face_value?.toLocaleString()}券 × {giftModal.mode === 'sell' ? (t.ticket_count || 10) : 1}枚{giftModal.mode === 'sell' && t.sale_price ? ` / 販売価格¥${t.sale_price?.toLocaleString()}` : ""}）
                            </option>
                          ))}
                        </select>
                      </div>
                      {giftModal.mode === 'sell' && giftForm.templateId && (() => {
                        const t = giftTicketTemplates.find(t => t.id === giftForm.templateId);
                        return t ? (
                          <div style={{ background: "#f0f8f4", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
                            <div style={{ fontSize: 13, color: "#3a5a3a" }}>発行枚数: <strong>{t.ticket_count || 10}枚</strong></div>
                            <div style={{ fontSize: 13, color: "#3a5a3a" }}>額面合計: <strong>¥{((t.ticket_count || 10) * t.face_value)?.toLocaleString()}</strong></div>
                            {t.sale_price && <div style={{ fontSize: 13, color: "#e0a040" }}>販売価格: <strong>¥{t.sale_price?.toLocaleString()}</strong></div>}
                          </div>
                        ) : null;
                      })()}
                      <button onClick={issueGiftTickets} disabled={giftSaving || !giftSelectedCustomer || !giftForm.templateId}
                        style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: !giftSelectedCustomer || !giftForm.templateId ? "#e8ddd0" : giftModal.mode === 'sell' ? "linear-gradient(135deg, #5a9e7a, #3a7a5a)" : "linear-gradient(135deg, #e0a040, #c07020)", color: !giftSelectedCustomer || !giftForm.templateId ? "#bbb" : "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                        {giftSaving ? "発行中..." : giftModal.mode === 'sell' ? "💳 販売して発行する" : "🎁 プレゼントとして発行する"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", margin: 0 }}>🎫 金券管理</h2>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
              <div onClick={() => { setGiftModal({ mode: 'sell' }); setGiftSelectedCustomer(null); setGiftForm({}); setGiftCustomerSearch(""); setGiftCustomerResult(null); }}
                style={{ flex: 1, minWidth: 200, background: "linear-gradient(135deg, #eaf5ec, #d0ecd8)", borderRadius: 20, padding: "28px 24px", cursor: "pointer", boxShadow: "0 4px 16px rgba(90,158,122,0.15)", border: "2px solid #5a9e7a20" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎫</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", marginBottom: 4 }}>金券を販売する</div>
                <div style={{ fontSize: 12, color: "#7a9a7a" }}>10枚セットを顧客に販売</div>
              </div>
              <div onClick={() => { setGiftModal({ mode: 'present' }); setGiftSelectedCustomer(null); setGiftForm({}); setGiftCustomerSearch(""); setGiftCustomerResult(null); }}
                style={{ flex: 1, minWidth: 200, background: "linear-gradient(135deg, #fdf5e0, #fce8c0)", borderRadius: 20, padding: "28px 24px", cursor: "pointer", boxShadow: "0 4px 16px rgba(224,160,64,0.15)", border: "2px solid #e0a04020" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#7a4a00", marginBottom: 4 }}>金券をプレゼントする</div>
                <div style={{ fontSize: 12, color: "#a07040" }}>キャンペーン等で1枚プレゼント</div>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>金券テンプレート設定</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>⚙️ 設定 → 金券管理 でテンプレートを編集できます</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {giftTicketTemplates.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, background: "white", borderRadius: 16, color: "#aaa" }}>金券テンプレートがありません</div>
              ) : (
                giftTicketTemplates.map(t => (
                  <div key={t.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a" }}>🎫 {t.name}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>¥{t.face_value?.toLocaleString()}券 × {t.ticket_count || 10}枚セット</div>
                        {t.sale_price && <div style={{ fontSize: 12, color: "#e0a040" }}>販売価格: ¥{t.sale_price?.toLocaleString()}</div>}
                      </div>
                      <div style={{ fontSize: 11, background: t.is_active ? "#eaf5ec" : "#f0ebe4", color: t.is_active ? "#5a9e7a" : "#aaa", borderRadius: 20, padding: "4px 12px" }}>{t.is_active ? "有効" : "無効"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "customers" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", marginBottom: 16 }}>顧客一覧</h2>
            {loading ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>読み込み中...</div> : (
              <div style={{ background: "white", borderRadius: 16, overflow: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
                      {["顧客番号","氏名","電話番号","メール","LINE"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#7a9a7a" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#aaa" }}>顧客がいません</td></tr>}
                    {customers.map((c, i) => (
                      <tr key={c.id} style={{ borderTop: "1px solid #f0ebe4", cursor: "pointer" }} onClick={() => { setSelectedCustomer(c); fetchCustomerHistory(c.id); }}>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#3a5a3a" }}>{c.customer_number || i+1}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#5a9e7a" }}>{c.name}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#3a5a3a" }}>{c.tel}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#3a5a3a" }}>{c.email}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: c.line_user_id ? "#5a9e7a" : "#ccc" }}>{c.line_user_id ? "✓ 連携済" : "未連携"}</td>
                      </tr>
                    ))}
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
