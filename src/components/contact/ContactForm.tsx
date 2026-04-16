'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ContactFormData, ContactFormErrors, ContactApiResponse } from '@/lib/types/contact';

interface ContactFormProps {
  onSubmit: (data: ContactFormData) => Promise<ContactApiResponse>;
  onSuccess: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({ onSubmit, onSuccess }) => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    message: '',
    honeypot: '',
  });
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const formRef = useRef<HTMLFormElement>(null);

  const validate = (): boolean => {
    const newErrors: ContactFormErrors = {};
    if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading' || status === 'success') return;

    if (!validate()) {
      setTimeout(() => {
        const firstInvalid = formRef.current?.querySelector('[aria-invalid="true"]') as HTMLElement;
        if (firstInvalid) {
          firstInvalid.focus();
        }
      }, 0);
      return;
    }

    if (formData.honeypot) {
      setStatus('success');
      return;
    }

    setStatus('loading');
    setErrors({});
    
    try {
      const response = await onSubmit(formData);
      if (response.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrors({ general: response.message || 'Something went wrong. Please try again.' });
      }
    } catch (err) {
      setStatus('error');
      setErrors({ general: 'Something went wrong. Please try again.' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for field
    if (errors[name as keyof ContactFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        onSuccess();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [status, onSuccess]);

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg
            className="w-full h-full text-[#4A90D9]"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="32"
              cy="32"
              r="30"
              stroke="currentColor"
               strokeWidth="4"
              className="animate-[draw-circle_400ms_ease-in-out_forwards]"
              strokeDasharray="189"
              strokeDashoffset="189"
            />
            <path
              d="M18 32 L28 42 L46 22"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-[draw-check_400ms_ease-in-out_400ms_forwards]"
              strokeDasharray="45"
              strokeDashoffset="45"
            />
          </svg>
          <style>{`
            @keyframes draw-circle {
              to { stroke-dashoffset: 0; }
            }
            @keyframes draw-check {
              to { stroke-dashoffset: 0; }
            }
          `}</style>
        </div>
        <p className="font-(family-name:--font-antic) text-[#1A1A2E] text-sm">Message sent</p>
      </div>
    );
  }

  const isLoading = status === 'loading';

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col w-full font-(family-name:--font-antic)">
      <div className="space-y-5">
        <div className="flex flex-col">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your name"
            className="border border-[#4A90D9]/30 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A90D9] focus:border-transparent transition-shadow text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 disabled:opacity-50"
            disabled={isLoading}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div className="flex flex-col">
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your@email.com"
            className="border border-[#4A90D9]/30 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A90D9] focus:border-transparent transition-shadow text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 disabled:opacity-50"
            disabled={isLoading}
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        <div className="flex flex-col relative">
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Your message..."
            maxLength={1000}
            rows={4}
            className="border border-[#4A90D9]/30 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A90D9] focus:border-transparent transition-shadow resize-none text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 disabled:opacity-50"
            disabled={isLoading}
            aria-invalid={!!errors.message}
          />
          <div className="flex justify-between items-start mt-1">
            <span className="text-red-500 text-sm flex-1">{errors.message || ' '}</span>
            <span className="text-xs text-[#1A1A2E]/50 text-right shrink-0 ml-4 font-(family-name:--font-antic)">
              {formData.message.length} / 1000
            </span>
          </div>
        </div>

        <input
          type="text"
          name="honeypot"
          value={formData.honeypot}
          onChange={handleChange}
          className="absolute opacity-0 h-0 w-0 overflow-hidden"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="mt-6">
        <button
          type="submit"
          className="w-full bg-[#4A90D9] text-white rounded-lg py-3 hover:bg-[#3d77b3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending...
            </>
          ) : (
            'Send message'
          )}
        </button>
      </div>

      {errors.general && <p className="text-red-500 text-sm mt-4 text-center">{errors.general}</p>}
    </form>
  );
};
