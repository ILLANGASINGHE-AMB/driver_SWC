import React, { useState } from 'react';
import { Modal } from './Modal';
import { db } from '../api/db';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import type { Customer } from '../types';

// Port of app.js's showAddCustomerModal/saveNewCustomer field set.
export function AddCustomerModal({ onClose, onAdded }: { onClose: () => void; onAdded: (c: Customer) => void }) {
  const { driver } = useAuth();
  const toast = useToast();
  const [hotelName, setHotelName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelName.trim()) return toast('Hotel name is required', 'error');
    setSubmitting(true);
    try {
      const id = await db.addCustomer({ hotel_name: hotelName.trim(), contact_person: contact.trim(), phone: phone.trim(), email: email.trim(), address: address.trim() });
      await db.logAction('Add Customer', `Added new customer "${hotelName.trim()}" (Phone: ${phone || 'N/A'})`, { id, hotel_name: hotelName }, 'Customer', driver?.name || 'Driver');
      toast('Customer added successfully!');
      onAdded({ id, hotel_name: hotelName.trim(), contact_person: contact, phone, email, address });
    } catch (err) {
      toast('Failed to save customer: ' + ((err as Error).message || err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add Customer" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Hotel Name *</label>
          <input className="form-input" value={hotelName} onChange={(e) => setHotelName(e.target.value)} maxLength={100} required />
        </div>
        <div className="form-group">
          <label className="form-label">Contact Person</label>
          <input className="form-input" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={80} />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={100} />
        </div>
        <div className="form-group">
          <label className="form-label">Address</label>
          <input className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            <i className="fas fa-save" /> {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
