import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Package } from 'lucide-react';
import RDRLogo from './RDRLogo';
import ProgressTracker from './ProgressTracker';

interface ClientWelcomeProps {
  clientName?: string;
  packageName?: string;
  estimatedDelivery?: string;
  className?: string;
}

const ClientWelcome: React.FC<ClientWelcomeProps> = ({ 
  clientName = "John Smith",
  packageName = "Professional Resume Package",
  estimatedDelivery = "2024-02-15",
  className = ""
}) => {
  const deliveryDate = new Date(estimatedDelivery);
  const today = new Date();
  const daysRemaining = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const timeDiff = deliveryDate.getTime() - now.getTime();
      
      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeRemaining({ days, hours, minutes });
      } else {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0 });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deliveryDate]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Logo */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <RDRLogo />
          <div className="text-right">
            <p className="text-sm text-rdr-medium-gray">Welcome back,</p>
            <h1 className="text-2xl font-bold text-rdr-navy font-heading">{clientName}</h1>
          </div>
        </div>
      </div>

      {/* Package Info */}
      <div className="bg-gradient-to-r from-rdr-navy to-rdr-navy/90 rounded-xl p-6 shadow-lg text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-rdr-gold" />
              <span className="text-sm font-medium text-rdr-gold">Your Package</span>
            </div>
            <h2 className="text-xl font-bold mb-1 font-heading">{packageName}</h2>
            <p className="text-white/80 text-sm">Professional resume writing and optimization</p>
          </div>
        </div>
      </div>

      {/* Delivery Timeline */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rdr-gold/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-rdr-gold" />
            </div>
            <div>
              <h3 className="font-semibold text-rdr-navy">Estimated Delivery</h3>
              <p className="text-sm text-rdr-medium-gray">Expected completion date</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-rdr-navy mb-1">
            {deliveryDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric' 
            })}
          </div>
          <p className="text-rdr-medium-gray text-sm">
            {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Due today'}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rdr-navy/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-rdr-navy" />
            </div>
            <div>
              <h3 className="font-semibold text-rdr-navy">Time Remaining</h3>
              <p className="text-sm text-rdr-medium-gray">Until completion</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-rdr-navy mb-1">
            {daysRemaining > 0 ? `${daysRemaining} Days` : 'Today'}
          </div>
          <p className="text-rdr-medium-gray text-sm">
            {daysRemaining > 0 ? 'On schedule' : 'Final review'}
          </p>
          {timeRemaining.days > 0 && (
            <p className="text-xs text-rdr-medium-gray/80 mt-1">
              {timeRemaining.days} Days, {timeRemaining.hours} hours, {timeRemaining.minutes} Minutes
            </p>
          )}
        </div>
      </div>

      {/* Progress Tracker */}
      <ProgressTracker />
    </div>
  );
};

export default ClientWelcome;