// One-off generator: messages/bn.json = copy of en.json with a curated
// set of high-visibility strings translated to Bengali. Untranslated keys
// remain in English, so the app renders cleanly in `bn` mode (the i18n
// loader falls back per-key only if the file were missing — here it's
// complete, just partially translated).
import { readFileSync, writeFileSync } from "node:fs";

const en = JSON.parse(readFileSync("messages/en.json", "utf8"));
const bn = structuredClone(en);

// key path -> Bengali string. Only exact, placeholder-free strings are
// translated to avoid breaking ICU ({count}, {name}, ...) placeholders.
const map = {
  // Sidebar
  "Sidebar.title": "বিজবট CRM",
  "Sidebar.dashboard": "ড্যাশবোর্ড",
  "Sidebar.inbox": "ইনবক্স",
  "Sidebar.notifications": "নোটিফিকেশন",
  "Sidebar.contacts": "কন্টাক্টস",
  "Sidebar.pipelines": "পাইপলাইন",
  "Sidebar.broadcasts": "ব্রডকাস্ট",
  "Sidebar.automations": "অটোমেশন",
  "Sidebar.flows": "ফ্লো",
  "Sidebar.aiAgents": "এআই এজেন্ট",
  "Sidebar.settings": "সেটিংস",
  "Sidebar.beta": "বিটা",
  "Sidebar.roleOwner": "মালিক",
  "Sidebar.roleAdmin": "অ্যাডমিন",
  "Sidebar.roleAgent": "এজেন্ট",
  "Sidebar.roleViewer": "দর্শক",
  "Sidebar.closeMenu": "মেনু বন্ধ করুন",
  "Sidebar.defaultUser": "ব্যবহারকারী",
  "Sidebar.menuProfile": "প্রোফাইল",
  "Sidebar.menuSettings": "সেটিংস",
  "Sidebar.menuSignOut": "সাইন আউট",
  // Header
  "Header.dashboard": "ড্যাশবোর্ড",
  "Header.inbox": "ইনবক্স",
  "Header.notifications": "নোটিফিকেশন",
  "Header.contacts": "কন্টাক্টস",
  "Header.pipelines": "পাইপলাইন",
  "Header.broadcasts": "ব্রডকাস্ট",
  "Header.automations": "অটোমেশন",
  "Header.settings": "সেটিংস",
  "Header.openMenu": "মেনু খুলুন",
  "Header.openAccountMenu": "অ্যাকাউন্ট মেনু খুলুন",
  "Header.defaultUser": "ব্যবহারকারী",
  "Header.defaultAvatar": "অবতার",
  "Header.menuProfile": "প্রোফাইল",
  "Header.menuSettings": "সেটিংস",
  "Header.menuSignOut": "সাইন আউট",
  // Login
  "LoginPage.titleAccept": "গ্রহণ করতে সাইন ইন করুন",
  "LoginPage.titleWelcome": "স্বাগতম",
  "LoginPage.descAccept": "সাইন ইন করুন, আমরা আপনাকে ইনভিটেশনে নিয়ে যাব।",
  "LoginPage.descWelcome": "আপনার অ্যাকাউন্টে সাইন ইন করুন",
  "LoginPage.emailLabel": "ইমেইল",
  "LoginPage.passwordLabel": "পাসওয়ার্ড",
  "LoginPage.forgotPassword": "পাসওয়ার্ড ভুলে গেছেন?",
  "LoginPage.passwordPlaceholder": "আপনার পাসওয়ার্ড লিখুন",
  "LoginPage.signingIn": "সাইন ইন হচ্ছে...",
  "LoginPage.signIn": "সাইন ইন",
  "LoginPage.noAccount": "অ্যাকাউন্ট নেই?",
  "LoginPage.createAccount": "অ্যাকাউন্ট তৈরি করুন",
  // ModeToggle
  "ModeToggle.switchMode": "মোড পরিবর্তন করুন",
  // Dashboard
  "Dashboard.page.title": "ড্যাশবোর্ড",
  "Dashboard.page.description": "আপনার ব্যবসার সংক্ষিপ্ত চিত্র",
  "Dashboard.page.activeConversations": "সক্রিয় কথোপকথন",
  "Dashboard.page.newContactsToday": "আজকের নতুন কন্টাক্ট",
  "Dashboard.page.openDealsValue": "ওপেন ডিলের মূল্য",
  "Dashboard.page.messagesSentToday": "আজ পাঠানো বার্তা",
  "Dashboard.page.openDeals": "ওপেন ডিল",
  "Dashboard.quickActions.newContact": "নতুন কন্টাক্ট",
  "Dashboard.quickActions.newDeal": "নতুন ডিল",
  "Dashboard.quickActions.newBroadcast": "নতুন ব্রডকাস্ট",
  "Dashboard.quickActions.newAutomation": "নতুন অটোমেশন",
  "Dashboard.activityFeed.title": "অ্যাক্টিভিটি ফিড",
  "Dashboard.pipelineDonut.title": "পাইপলাইন",
  "Dashboard.conversationsChart.title": "কথোপকথন",
  // Settings (message-based)
  "Settings.pageTitle": "সেটিংস",
  "Settings.pageDesc": "অ্যাকাউন্ট ও ওয়ার্কস্পেস সেটিংস",
  "Settings.overview.viewTeamMembers": "টিম মেম্বার দেখুন",
  "Settings.members.title": "টিম মেম্বার",
  "Settings.members.inviteMember": "মেম্বার ইনভাইট করুন",
  "Settings.members.online": "অনলাইন",
  "Settings.members.away": "অনুপস্থিত",
  "Settings.members.offline": "অফলাইন",
  // Contacts
  "Contacts.page.title": "কন্টাক্টস",
  "Contacts.page.subtitle": "আপনার কন্টাক্টস ও তাদের তথ্য",
  "Contacts.page.addContactBtn": "কন্টাক্ট যোগ করুন",
  "Contacts.page.searchPlaceholder": "সার্চ করুন",
  "Contacts.page.noContactsYet": "কোনো কন্টাক্ট নেই",
  "Contacts.page.editAction": "এডিট",
  "Contacts.page.deleteAction": "ডিলিট",
  "Contacts.page.addFirstContact": "প্রথম কন্টাক্ট যোগ করুন",
  // Pipelines
  "Pipelines.page.selectPipeline": "পাইপলাইন নির্বাচন করুন",
  "Pipelines.page.addPipeline": "পাইপলাইন যোগ করুন",
  "Pipelines.page.addDeal": "ডিল যোগ করুন",
  "Pipelines.page.createPipeline": "পাইপলাইন তৈরি করুন",
  "Pipelines.page.newPipeline": "নতুন পাইপলাইন",
  "Pipelines.page.pipelineName": "পাইপলাইনের নাম",
  "Pipelines.card.won": "জিতেছে",
  "Pipelines.card.lost": "হেরেছে",
  "Pipelines.form.newDeal": "নতুন ডিল",
  "Pipelines.form.editDeal": "ডিল এডিট করুন",
  "Pipelines.form.title": "শিরোনাম",
  "Pipelines.form.contact": "কন্টাক্ট",
  "Pipelines.form.value": "মূল্য",
  "Pipelines.form.currency": "কারেন্সি",
  "Pipelines.form.notes": "নোট",
  // Broadcasts
  "Broadcasts.page.title": "ব্রডকাস্ট",
  "Broadcasts.page.subtitle": "টেমপ্লেট ব্যবহার করে ক্লায়েন্টদের বাল্ক মেসেজ পাঠান",
  "Broadcasts.page.newBroadcast": "নতুন ব্রডকাস্ট",
  "Broadcasts.status.draft": "ড্রাফট",
  "Broadcasts.status.scheduled": "শিডিউল",
  "Broadcasts.status.sending": "পাঠানো হচ্ছে",
  "Broadcasts.status.sent": "পাঠানো হয়েছে",
  "Broadcasts.status.failed": "ব্যর্থ",
  "Broadcasts.status.delivered": "ডেলিভার্ড",
  "Broadcasts.status.read": "পঠিত",
  "Broadcasts.detail.exportCsv": "CSV এক্সপোর্ট",
  // Automations
  "Automations.list.title": "অটোমেশন",
  "Automations.list.subtitle": "ইনবাউন্ড মেসেজ, নতুন কন্টাক্ট বা শিডিউলে ট্রিগার",
  "Automations.list.create": "তৈরি করুন",
  "Automations.list.templatesTitle": "টেমপ্লেট",
  "Automations.list.emptyTitle": "কোনো অটোমেশন নেই",
  "Automations.list.activate": "অ্যাকটিভেট",
  "Automations.list.deactivate": "ডি-অ্যাকটিভেট",
  "Automations.list.edit": "এডিট",
  "Automations.list.duplicate": "ডুপ্লিকেট",
  "Automations.list.delete": "ডিলিট",
  "Automations.list.viewLogs": "লগ দেখুন",
  // Flows
  "Flows.list.title": "ফ্লো",
  "Flows.list.description": "ভিজুয়াল বিল্ডার দিয়ে ওয়ার্কফ্লো তৈরি করুন",
  "Flows.list.newFlow": "নতুন ফ্লো",
  "Flows.list.statusDraft": "ড্রাফট",
  "Flows.list.statusActive": "অ্যাকটিভ",
  "Flows.list.statusArchived": "আর্কাইভ",
  "Flows.list.edit": "এডিট",
  "Flows.list.delete": "ডিলিট",
};

let applied = 0;
for (const [key, value] of Object.entries(map)) {
  const parts = key.split(".");
  let node = bn;
  let ok = true;
  for (let i = 0; i < parts.length - 1; i++) {
    if (node[parts[i]] && typeof node[parts[i]] === "object") {
      node = node[parts[i]];
    } else {
      ok = false;
      break;
    }
  }
  if (ok && node[parts[parts.length - 1]] !== undefined) {
    node[parts[parts.length - 1]] = value;
    applied++;
  } else {
    console.warn("SKIP (key not found):", key);
  }
}

writeFileSync("messages/bn.json", JSON.stringify(bn, null, 2) + "\n");
console.log(`Applied ${applied}/${Object.keys(map).length} Bengali translations -> messages/bn.json`);
