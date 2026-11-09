import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Card, DataTable, StatusBadge, Button, Modal, Field, inputCls, cx } from '../../components/common';
import { inr, fmtDate } from '../../lib/format';

export default function FarmerOrders() {
  const { user } = useAuth();
  const { db, run } = useData();
  const { showToast } = useToast();
  const [tab, setTab] = useState('orders');
  const [replying, setReplying] = useState(null);
  const [reply, setReply] = useState('');

  const orders = db.orders.filter((o) => o.farmerId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const enquiries = db.enquiries.filter((e) => e.farmerId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const respond = (o, accept) => {
    const res = run('respondOrder', { orderId: o.id, accept, reason: accept ? '' : 'Stock unavailable' });
    showToast(res.ok ? `Order ${o.id} ${accept ? 'accepted' : 'rejected'}.` : res.error, res.ok ? 'success' : 'info');
  };

  const sendReply = (e) => {
    e.preventDefault();
    const res = run('replyEnquiry', { id: replying.id, reply });
    if (!res.ok) return showToast(res.error);
    showToast('Reply sent.', 'success');
    setReplying(null);
    setReply('');
  };

  const orderActions = (o) => {
    const trReq = db.transportRequests.find((r) => r.orderId === o.id && ['Open', 'Confirmed', 'Completed'].includes(r.status));
    const shipment = db.shipments.find((s) => s.orderId === o.id);
    if (o.status === 'Placed') {
      return (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => respond(o, true)}>Accept</Button>
          <Button size="sm" variant="danger" onClick={() => respond(o, false)}>Reject</Button>
        </div>
      );
    }
    if (shipment) return <Button as={Link} to={`/farmer/track/${shipment.trackingId}`} size="sm" variant="secondary">Track</Button>;
    if (o.status === 'Accepted' && !trReq) return <Button as={Link} to={`/farmer/transport?order=${o.id}`} size="sm" variant="secondary">Request transport</Button>;
    if (trReq?.status === 'Open') {
      const n = db.transportBids.filter((b) => b.requestId === trReq.id && b.status === 'Pending').length;
      return <Button as={Link} to="/farmer/transport" size="sm" variant="secondary">{n} offer{n === 1 ? '' : 's'} to review</Button>;
    }
    return null;
  };

  return (
    <>
      <PageHeader title="Orders and enquiries" subtitle="Respond to buyers and arrange transport for accepted orders." />
      <div className="flex gap-2 mb-4">
        {[['orders', `Orders (${orders.length})`], ['enquiries', `Enquiries (${enquiries.length})`]].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx('px-4 py-2 rounded-xl text-sm font-bold cursor-pointer', tab === k ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-100 text-zinc-600 hover:bg-emerald-50')}>{label}</button>
        ))}
      </div>

      {tab === 'orders' && (
        <Card>
          <DataTable
            rows={orders}
            empty="No orders yet."
            columns={[
              { key: 'id', label: 'Order' },
              { key: 'p', label: 'Produce', render: (o) => db.listings.find((l) => l.id === o.listingId)?.name },
              { key: 'c', label: 'Customer', render: (o) => { const c = db.users.find((u) => u.id === o.customerId); return <div><div className="font-semibold">{c?.name}</div><div className="text-xs text-zinc-500">{c?.location}</div></div>; } },
              { key: 'q', label: 'Quantity', render: (o) => `${o.quantity} ${o.unit}` },
              { key: 't', label: 'Total', render: (o) => inr(o.totalAmount) },
              { key: 'd', label: 'Date', render: (o) => fmtDate(o.createdAt) },
              { key: 's', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
              { key: 'pay', label: 'Payment', render: (o) => { const p = db.payments.find((x) => x.kind === 'Order' && x.orderId === o.id); return p ? <div><StatusBadge status={p.status} /><div className="text-[11px] text-zinc-400 mt-1">{p.method === 'Cash on delivery' ? 'Cash on delivery' : `you get ${inr(p.netAmount)}`}</div></div> : null; } },
              { key: 'a', label: 'Action', render: orderActions },
            ]}
          />
        </Card>
      )}

      {tab === 'enquiries' && (
        <div className="space-y-4">
          {enquiries.length === 0 && <Card><p className="text-sm text-zinc-500">No enquiries yet.</p></Card>}
          {enquiries.map((e) => {
            const c = db.users.find((u) => u.id === e.customerId);
            const l = db.listings.find((x) => x.id === e.listingId);
            return (
              <Card key={e.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-zinc-900">{c?.name} <span className="font-normal text-zinc-500">about</span> {l?.name}</div>
                    <div className="text-xs text-zinc-400">{fmtDate(e.createdAt)} · {c?.location}</div>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <p className="text-sm text-zinc-700 mt-3 bg-zinc-50 rounded-xl p-3">{e.message}</p>
                {e.reply
                  ? <p className="text-sm text-emerald-900 mt-2 bg-emerald-50 rounded-xl p-3"><span className="font-bold">Your reply: </span>{e.reply}</p>
                  : <Button size="sm" className="mt-3" onClick={() => setReplying(e)}>Reply</Button>}
              </Card>
            );
          })}
        </div>
      )}

      {replying && (
        <Modal title="Reply to enquiry" onClose={() => setReplying(null)}>
          <form onSubmit={sendReply} className="space-y-4">
            <p className="text-sm text-zinc-600 bg-zinc-50 rounded-xl p-3">{replying.message}</p>
            <Field label="Your reply"><textarea required rows={4} value={reply} onChange={(e) => setReply(e.target.value)} className={inputCls} /></Field>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setReplying(null)}>Cancel</Button><Button type="submit">Send reply</Button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
