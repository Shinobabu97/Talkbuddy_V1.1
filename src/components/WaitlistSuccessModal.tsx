import React from 'react';
import { X, CheckCircle } from 'lucide-react';

interface WaitlistSuccessModalProps {
  isOpen: boolean;
  email: string | null;
  onClose: () => void;
}

export default function WaitlistSuccessModal({
  isOpen,
  email,
  onClose,
}: WaitlistSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-background-light rounded-lg max-w-md w-full p-6 relative border border-gray-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200"
          aria-label="Close acknowledgement"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-text font-display">
            You&apos;re on the wait list!
          </h2>
          <p className="text-text-muted font-body text-sm">
            Your waitlist form has been submitted successfully.
            {email && (
              <>
                {' '}
                Please check your email at{' '}
                <span className="font-semibold text-text">{email}</span> for an
                acknowledgement from TalkBuddy.
              </>
            )}
          </p>
          <button
            onClick={onClose}
            className="mt-2 w-full py-3 px-6 btn-glossy rounded-full font-bold text-base"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


