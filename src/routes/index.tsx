import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight, CircleCheck, Clock3, Download, FileText, HandCoins, HeartHandshake, Leaf, MapPin, Monitor, Plus, ShieldCheck, ShoppingBag, Smartphone, Sprout, Store, User, Wheat, Scissors, Shapes, Calculator, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { advance, categories, locations, money, receiptText, sampleOrders, split, totals, type Order, type Status } from "@/lib/ledger";
import tote from "@/assets/tote.webp.asset.json";
import basket from "@/assets/basket.webp.asset.json";
import beans from "@/assets/beans.webp.asset.json";
import printing from "@/assets/printing.webp.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "LipaHub Kalobeyei — Local Orders & Payout Ledger" },
    { name: "description", content: "Track local orders, simulated milestone escrow and transparent 90/10 seller payouts in Kalobeyei. Powered by Okuu Cyber." },
    { property: "og:title", content: "LipaHub Kalobeyei — Local Orders & Payout Ledger" },
    { property: "og:description", content: "A community-first milestone ledger for Kalobeyei makers and traders, by Okuu Cyber." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});
const statusInfo: Record<Status, { label: string; step: number }> = {
  placed: { label: "Awaiting payment", step: 0 }, escrow: { label: "In escrow", step: 1 }, quality: { label: "Quality check at KV3 Hub", step: 2 }, released: { label: "Funds released", step: 3 },
};
const filters = [{ label: "All orders", value: "all" }, { label: "In Escrow", value: "escrow" }, { label: "Quality Check", value: "quality" }, { label: "Released", value: "released" }] as const;
const images: Record<string, string> = { "Clothing & Tailoring": tote.url, "Crafts & Art": basket.url, "Food & Spices": beans.url, "Digital Services": printing.url };
const categoryIcons: Record<string, typeof Leaf> = { "Clothing & Tailoring": Scissors, "Crafts & Art": Shapes, "Food & Spices": Wheat, "Digital Services": Monitor };
const storageKey = "lipahub-kalobeyei-orders-v1";
function validOrders(value: unknown): value is Order[] {
  return Array.isArray(value) && value.every((o: unknown) => {
    if (typeof o !== "object" || o === null) return false;
    const row = o as Record<string, unknown>;
    return ["id", "item", "buyer", "seller", "location", "category", "createdAt"].every(key => typeof row[key] === "string") && typeof row['price'] === "number" && Number.isFinite(row['price']) && row['price'] > 0 && ["placed", "escrow", "quality", "released"].includes(String(row['status'])) && (row['paidAt'] === undefined || typeof row['paidAt'] === "string") && (row['releasedAt'] === undefined || typeof row['releasedAt'] === "string");
  });
}

function Index() {
  const [orders, setOrders] = useState<Order[]>(sampleOrders);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [filter, setFilter] = useState("all");
  const [newOrder, setNewOrder] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneSent, setPhoneSent] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [calculatorPrice, setCalculatorPrice] = useState("1100");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try { const stored = localStorage.getItem(storageKey); if (stored) { const parsed: unknown = JSON.parse(stored); if (validOrders(parsed)) setOrders(parsed); else setStorageError("Saved orders could not be read. Sample orders are shown."); } } catch { setStorageError("Browser storage is unavailable. Orders will stay in this session only."); }
    setReady(true);
  }, []);
  useEffect(() => { if (!ready) return; try { localStorage.setItem(storageKey, JSON.stringify(orders)); } catch { setStorageError("Changes cannot be saved in this browser. Keep this page open to retain your orders."); } }, [orders, ready]);
  const summary = totals(orders);
  const filtered = orders.filter(order => filter === "all" || order.status === filter);
  const payment = orders.find(order => order.id === paymentId);
  const release = orders.find(order => order.id === releaseId);
  const receipt = orders.find(order => order.id === receiptId);
  const calculation = split(Math.max(0, Number(calculatorPrice) || 0));
  function progress(id: string) {
    setOrders(current => current.map(order => order.id === id ? advance(order, new Date().toISOString()) : order));
  }
  function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const item = String(data.get("item") ?? "").trim(); const buyer = String(data.get("buyer") ?? "").trim(); const seller = String(data.get("seller") ?? "").trim(); const price = Number(data.get("price"));
    if (!item || !buyer || !seller || !Number.isFinite(price) || price <= 0) return;
    const order: Order = { id: `LH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, item, buyer, seller, price: Math.round(price * 100) / 100, location: String(data.get("location")), category: String(data.get("category")), status: "placed", createdAt: new Date().toISOString() };
    setOrders(current => [order, ...current]); setNewOrder(false); setFilter("all"); setNotice(`${order.item} added. Ready for payment.`);
  }
  function startPayment(id: string) { setPaymentId(id); setPhone(""); setPhoneSent(false); setPhoneError(""); }
  function sendPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!/^(?:0[17]\d{8}|(?:\+?254)[17]\d{8})$/.test(phone.replace(/[\s-]/g, ""))) { setPhoneError("Enter a valid Kenyan number, e.g. 0712 345 678."); return; }
    setPhoneError(""); setPhoneSent(true);
  }
  function downloadReceipt(order: Order) {
    const blob = new Blob([receiptText(order)], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `${order.id}-receipt.txt`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  return (
    <div>
      <header className="app-header"><div className="header-inner">
        <div className="flex items-center gap-3"><div className="brand-mark"><HandCoins strokeWidth={1.7}/></div><div><div className="brand-name">LipaHub <span className="font-medium">Kalobeyei</span></div><div className="brand-tagline">Local trade. Shared trust. Stronger community.</div></div></div>
        <div className="flex items-center gap-5"><div className="partner"><div className="partner-icon"><Monitor size={18}/></div><div><div className="text-[9px] text-muted-foreground">POWERED BY</div><div className="text-xs font-bold">Okuu Cyber</div></div></div><span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="size-1.5 rounded-full bg-primary"/> Local ledger</span><Button className="new-order" onClick={() => setNewOrder(true)} aria-label="New Order"><Plus/><span className="new-order-label">New Order</span></Button></div>
      </div></header>
      <main className="shell">
        <section className="intro"><div><div className="eyebrow">YOUR COMMUNITY TRADE LEDGER</div><h1>Good work. Fair pay.</h1><p>Every order tracked. Every maker valued. Every shilling accounted for.</p></div><div className="local-badge"><MapPin size={13}/> Kalobeyei · Kakuma · Turkana West</div></section>
        <section className="stats-grid" aria-label="Ledger summary">
          <Summary label="Total Escrow Held" value={summary.held} note={`${orders.filter(o => o.status === "escrow" || o.status === "quality").length} orders awaiting completion`} icon={ShieldCheck} noteIcon={LockKeyhole}/>
          <Summary label="Released to Sellers" value={summary.released} note="90% paid directly to local makers" icon={ArrowUpRight} noteIcon={CircleCheck}/>
          <Summary label="Hub Upkeep Collected" value={summary.upkeep} note="10% supporting our KV3 Hub" icon={Store} noteIcon={Sprout}/>
        </section>
        {storageError && <p className="notice mb-5" role="alert">{storageError}</p>}
        {notice && <div className="flex items-center justify-between text-xs text-primary bg-secondary rounded-md px-3 py-2 mb-5" role="status">{notice}<Button variant="ghost" size="sm" onClick={() => setNotice("")}>Dismiss</Button></div>}
        <div className="workspace">
          <section aria-label="Order tracker"><div className="section-title"><h2>Order & milestone tracker <span className="count">{orders.length}</span></h2><span className="text-[10px] text-muted-foreground flex items-center gap-1.5"><Clock3 size={11}/> All activity</span></div>
            <div className="filter-bar" aria-label="Filter orders">{filters.map(f => <Button key={f.value} variant="filter" data-active={filter === f.value} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)} title={f.value === "quality" ? "Quality Check at KV3 Hub" : f.label}>{f.label}<span className="text-[9px] opacity-65">{f.value === "all" ? orders.length : orders.filter(o => o.status === f.value).length}</span></Button>)}</div>
            <div className="order-grid">{filtered.map(order => <OrderCard key={order.id} order={order} onPayment={() => startPayment(order.id)} onQuality={() => { progress(order.id); setNotice(`${order.item} is now at KV3 Hub for quality check.`); }} onRelease={() => setReleaseId(order.id)} onReceipt={() => setReceiptId(order.id)}/>)}</div>
            {filtered.length === 0 && <div className="empty-state"><ShoppingBag className="mx-auto mb-3"/><h3 className="font-semibold text-foreground mb-2">No orders here yet</h3><p>New activity will appear in this view.</p></div>}
          </section>
          <aside><h2 className="aside-title"><Calculator size={15} className="text-muted-foreground"/> A fair split, every time</h2><div className="calculator"><div className="calculator-head"><HandCoins size={17}/> Payout split calculator</div><div className="calculator-body"><label className="field-label" htmlFor="calculator-price">Agreed order price</label><div className="price-input"><span>KES</span><Input id="calculator-price" type="number" min="0" step="0.01" value={calculatorPrice} onChange={e => setCalculatorPrice(e.target.value)}/></div><div className="split-bar"/><div className="split-row"><div className="split-symbol"><User size={15}/></div><div><div className="split-title">Direct maker / seller payout <span>90%</span></div><div className="split-value"><span>KES</span> {money(calculation.seller)}</div><div className="split-help">Goes straight to the person behind the work.</div></div></div><div className="split-row hub"><div className="split-symbol"><Store size={15}/></div><div><div className="split-title">KV3 Hub upkeep <span>10%</span></div><div className="split-value"><span>KES</span> {money(calculation.hub)}</div><div className="split-help">Keeps our shared hub running.</div></div></div></div><div className="calculator-foot"><ShieldCheck size={14} className="shrink-0 mt-0.5"/>Funds stay in escrow until quality is checked and the buyer confirms delivery.</div></div>
            <div className="community"><HeartHandshake size={29} strokeWidth={1.4}/><h3>Made locally.<br/>Growing together.</h3><p>From a tailor’s first stitch to a farmer’s harvest — we’re building trust in every exchange.</p><div className="community-line"><Leaf size={13}/> Supporting livelihoods across Kalobeyei</div></div>
            <div className="hub-location"><MapPin size={16} className="shrink-0 mt-1"/><div><strong>Your local hub: Okuu Cyber</strong><br/>KV3 Main Street, opposite the police station<br/><span className="italic">“Your Digital Needs, Our Priority”</span></div></div>
          </aside>
        </div>
        <footer className="app-footer"><span>© 2026 LipaHub Kalobeyei <span className="mx-2">·</span> A community initiative by <strong>Okuu Cyber</strong></span><span className="simulation-note"><ShieldCheck size={12}/> Demo ledger · Simulated payments only · No real funds transferred</span></footer>
      </main>
      <Dialog open={newOrder} onOpenChange={setNewOrder}><DialogContent className="modal"><DialogHeader><DialogTitle>Start a new order</DialogTitle><DialogDescription>A local maker. A clear agreement. A fair payout.</DialogDescription></DialogHeader><form onSubmit={createOrder}><div className="form-grid"><Field name="buyer" label="Buyer name" placeholder="e.g. Grace Achieng"/><Field name="seller" label="Seller name" placeholder="e.g. Mary Amina"/><div><label htmlFor="location">Seller location</label><select id="location" name="location">{locations.map(l => <option key={l}>{l}</option>)}</select></div><div><label htmlFor="category">Category</label><select id="category" name="category">{categories.map(c => <option key={c}>{c}</option>)}</select></div><div className="wide"><Field name="item" label="Item name" placeholder="e.g. Handmade kitenge tote"/></div><div className="wide"><Field name="price" label="Agreed price (KES)" type="number" placeholder="1,100"/></div></div><div className="flex justify-end gap-2 mt-6"><Button type="button" variant="outline" onClick={() => setNewOrder(false)}>Cancel</Button><Button type="submit"><Plus/>Create order</Button></div></form></DialogContent></Dialog>
      <Dialog open={Boolean(payment)} onOpenChange={open => { if (!open) setPaymentId(null); }}><DialogContent className="modal"><DialogHeader><DialogTitle>Simulate M-Pesa STK Push</DialogTitle><DialogDescription>{payment?.item} · {payment?.id}</DialogDescription></DialogHeader>{payment && (phoneSent ? <><div className="phone-preview"><Smartphone size={34}/><h3>M-Pesa payment prompt</h3><p>{phone}<br/>Pay LipaHub Kalobeyei</p><div className="phone-amount">KES {money(payment.price)}</div><p>Confirm the simulated payment below.</p></div><p className="notice">This is a simulation. No SMS is sent, no M-Pesa PIN is needed, and no money is charged.</p><Button onClick={() => { progress(payment.id); setPaymentId(null); setNotice(`Simulated payment received. KES ${money(payment.price)} is now in escrow.`); }}><Check/>Simulate successful payment</Button><Button variant="ghost" onClick={() => setPhoneSent(false)}>Back to phone number</Button></> : <form onSubmit={sendPrompt}><div className="modal-summary mb-5"><div><span>Total to hold in escrow</span><strong>KES {money(payment.price)}</strong></div><div><span>Seller payout on release (90%)</span><span>KES {money(split(payment.price).seller)}</span></div><div><span>Hub upkeep on release (10%)</span><span>KES {money(split(payment.price).hub)}</span></div></div><label className="field-label" htmlFor="phone">M-Pesa phone number</label><Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678" required autoComplete="tel"/>{phoneError && <p className="error-text mt-2" role="alert">{phoneError}</p>}<p className="notice my-4">Demo only. No real payment or phone notification will be sent.</p><Button type="submit" className="w-full"><Smartphone/>Send simulated STK prompt</Button></form>)}</DialogContent></Dialog>
      <Dialog open={Boolean(release)} onOpenChange={open => { if (!open) setReleaseId(null); }}><DialogContent className="modal"><DialogHeader><DialogTitle>Confirm delivery & release funds</DialogTitle><DialogDescription>Buyer confirmation for {release?.item}.</DialogDescription></DialogHeader>{release && <><div className="modal-summary"><div><span>Buyer</span><strong>{release.buyer}</strong></div><div><span>Total in escrow</span><strong>KES {money(release.price)}</strong></div><div><span>{release.seller} · 90%</span><strong className="text-primary">KES {money(split(release.price).seller)}</strong></div><div><span>KV3 Hub upkeep · 10%</span><strong className="text-gold-foreground">KES {money(split(release.price).hub)}</strong></div></div><p className="text-xs text-muted-foreground leading-6">By confirming, you acknowledge that the KV3 Hub quality check is complete and the buyer has received the agreed item.</p><p className="notice">Simulated release only. No real money is transferred.</p><Button onClick={() => { progress(release.id); setReleaseId(null); setReceiptId(release.id); setNotice("Delivery confirmed. Seller payout and hub upkeep recorded."); }}><CheckCheck/>Confirm Delivery & Release Funds</Button></>}</DialogContent></Dialog>
      <Dialog open={Boolean(receipt)} onOpenChange={open => { if (!open) setReceiptId(null); }}><DialogContent className="modal"><DialogHeader><DialogTitle>Order receipt</DialogTitle><DialogDescription>{receipt?.id} · {receipt?.status === "released" ? "Payment released" : "Payment held in escrow"}</DialogDescription></DialogHeader>{receipt && <><pre className="receipt-paper">{receiptText(receipt)}</pre><Button onClick={() => downloadReceipt(receipt)}><Download/>Download receipt</Button></>}</DialogContent></Dialog>
    </div>
  );
}
function Summary({ label, value, note, icon: Icon, noteIcon: NoteIcon }: { label: string; value: number; note: string; icon: typeof Leaf; noteIcon: typeof Leaf }) { return <article className="stat"><div className="stat-label">{label}<div className="stat-icon"><Icon size={17}/></div></div><div className="stat-value"><span>KES</span>{money(value)}</div><div className="stat-note"><NoteIcon size={11}/>{note}</div></article>; }
function Field({ name, label, placeholder, type = "text" }: { name: string; label: string; placeholder: string; type?: string }) { return <div><label htmlFor={name}>{label}</label><Input id={name} name={name} placeholder={placeholder} type={type} required maxLength={type === "text" ? 100 : undefined} {...(type === "number" ? { min: 0.01, step: 0.01 } : {})}/></div>; }
function OrderCard({ order, onPayment, onQuality, onRelease, onReceipt }: { order: Order; onPayment: () => void; onQuality: () => void; onRelease: () => void; onReceipt: () => void }) {
  const state = statusInfo[order.status]; const CategoryIcon = categoryIcons[order.category] ?? ShoppingBag;
  const steps = [{ label: <>Order<br/>placed</>, Icon: ShoppingBag }, { label: <>M-Pesa<br/>paid</>, Icon: Smartphone }, { label: <>KV3 Hub<br/>quality check</>, Icon: ShieldCheck }, { label: <>Buyer confirmed<br/>& released</>, Icon: CheckCheck }];
  return <article className="order-card" aria-label={`${order.item} order`}><div className="order-topline"><span className="category"><CategoryIcon size={11}/>{order.category}</span><span>{order.id}</span></div><div className="order-product"><img className="product-image" src={images[order.category] ?? tote.url} alt={order.item}/><div><h3>{order.item}</h3><div className="order-price"><span>KES</span> {money(order.price)}</div></div></div><div className="order-people"><div><div className="person-label"><User size={10}/> Buyer</div><div className="person-name">{order.buyer}</div></div><div><div className="person-label"><Store size={10}/> Seller</div><div className="person-name">{order.seller}</div><div className="person-location">{order.location}</div></div></div><div className="milestones"><div className="milestone-heading"><span>Order milestones</span><span>{state.step + 1} of 4 complete</span></div><div className="milestone-track">{steps.map(({ label, Icon }, i) => <div key={i} className={`milestone ${i <= state.step ? "completed" : i === state.step + 1 ? "current" : ""}`}><div className="step-dot">{i <= state.step ? <Check size={12} strokeWidth={2.5}/> : <Icon size={11}/>}</div>{label}</div>)}</div></div><div className="order-status-line"><span className={`status-badge status-${order.status}`}><span className="status-dot"/>{state.label}</span>{order.status !== "placed" && <Button variant="ghost" className="receipt-link" onClick={onReceipt}><FileText size={11}/>Receipt<ChevronRight size={11}/></Button>}</div><div className="order-action">{order.status === "placed" ? <Button variant="payment" onClick={onPayment}><Smartphone/>Simulate M-Pesa STK Push<ArrowRight/></Button> : order.status === "escrow" ? <Button variant="outline" onClick={onQuality}><ShieldCheck/>Send to KV3 Hub Quality Check<ArrowRight/></Button> : order.status === "quality" ? <Button variant="payment" onClick={onRelease}><CheckCheck/>Confirm Delivery & Release Funds</Button> : <div className="released-note"><CircleCheck size={13}/>KES {money(split(order.price).seller)} paid to seller<ArrowUpRight size={12}/></div>}</div></article>;
}