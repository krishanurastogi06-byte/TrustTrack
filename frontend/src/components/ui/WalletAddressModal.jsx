import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ngoService from '../../services/ngoService';

const walletSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address (must be 0x followed by 40 hex characters)')
    .toLowerCase(),
});

function WalletAddressModal({ isOpen, onClose, currentAddress, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(walletSchema),
    mode: 'onChange',
    defaultValues: {
      walletAddress: currentAddress || '',
    },
  });

  useEffect(() => {
    if (currentAddress) {
      setValue('walletAddress', currentAddress);
    }
  }, [currentAddress, setValue]);

  if (!isOpen) return null;

  async function onSubmit(values) {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const updated = await ngoService.updateWalletAddress(values.walletAddress);
      setSuccessMessage(`Wallet address updated successfully!`);
      reset();
      
      if (onSuccess) {
        onSuccess(updated);
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error updating wallet address:', err);
      const message = err?.response?.data?.error || err?.message || 'Failed to update wallet address';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Update Wallet Address</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 transition"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">
              <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Ethereum Wallet Address</label>
            <input
              type="text"
              placeholder="0x0000000000000000000000000000000000000000"
              {...register('walletAddress')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition font-mono text-sm"
              disabled={isLoading || !!successMessage}
            />
            {errors.walletAddress && (
              <p className="text-red-600 text-sm mt-1">{errors.walletAddress.message}</p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Enter your Ethereum wallet address where funds will be transferred
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition disabled:opacity-50"
              disabled={isLoading || !!successMessage}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isLoading || !!successMessage}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WalletAddressModal;
