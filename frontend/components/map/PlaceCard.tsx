'use client';

import React from 'react';
import { X, MapPin, Star, Navigation, Share2, Bookmark, Clock, Phone, Globe, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { PlacePOI } from '../../services/places.service';
import { GeocodingResult } from '../../services/geocoding.service';

export type PlaceDetail = PlacePOI | (GeocodingResult & { rating?: number; distanceMeters?: number; openNow?: boolean; category?: string });

interface PlaceCardProps {
  place: PlaceDetail;
  onClose: () => void;
  onGetDirections: (place: PlaceDetail) => void;
  onAskAIAboutPlace?: (placeName: string) => void;
}

export default function PlaceCard({
  place,
  onClose,
  onGetDirections,
  onAskAIAboutPlace,
}: PlaceCardProps) {
  const isPOI = 'rating' in place && typeof place.rating === 'number';
  const rating = isPOI ? (place as PlacePOI).rating : 4.5;
  const distanceKm = place.distanceMeters ? (place.distanceMeters / 1000).toFixed(1) : undefined;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: place.name,
        text: `Check out ${place.name} on TerritoryRun Map!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      const locationText = 'displayName' in place ? place.displayName : place.address;
      navigator.clipboard.writeText(`${place.name} - ${locationText || place.name}`);
      alert('Location details copied to clipboard!');
    }
  };

  const displayAddress = 'address' in place && typeof place.address === 'string' ? place.address : ('displayName' in place ? place.displayName : place.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="absolute bottom-6 left-4 z-[1000] w-[min(380px,calc(100vw-2rem))] pointer-events-auto"
    >
      <div className="bg-white/95 backdrop-blur-xl border border-black/10 shadow-2xl rounded-3xl overflow-hidden p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="inline-block px-2 py-0.5 rounded-full bg-[#A8D5BA]/20 text-[#2E7D52] text-[9px] font-black uppercase tracking-wider mb-1">
              {place.category || 'LOCATION'}
            </span>
            <h2 className="text-base font-black text-[#1a1a2e] leading-snug">{place.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Rating & Distance Metrics */}
        <div className="flex items-center gap-3 text-xs font-bold text-gray-600">
          <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
            <Star size={13} className="fill-amber-400" />
            <span>{rating}</span>
          </div>

          {distanceKm && (
            <div className="flex items-center gap-1 text-[#2E7D52] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
              <MapPin size={13} />
              <span>{distanceKm} km away</span>
            </div>
          )}

          {'openNow' in place && (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase ${
              place.openNow ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {place.openNow ? 'Open Now' : 'Closed'}
            </span>
          )}
        </div>

        {/* Address */}
        <div className="flex items-start gap-2 text-xs font-medium text-gray-500 pt-1">
          <MapPin size={15} className="shrink-0 text-gray-400 mt-0.5" />
          <span className="leading-relaxed">{displayAddress}</span>
        </div>

        {'openingHours' in place && place.openingHours && (
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <Clock size={14} className="shrink-0 text-gray-400" />
            <span>{place.openingHours}</span>
          </div>
        )}

        {'phone' in place && place.phone && (
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <Phone size={14} className="shrink-0 text-gray-400" />
            <a href={`tel:${place.phone}`} className="hover:text-[#2E7D52] underline">{place.phone}</a>
          </div>
        )}

        {'website' in place && place.website && (
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <Globe size={14} className="shrink-0 text-gray-400" />
            <a href={place.website} target="_blank" rel="noreferrer" className="hover:text-[#2E7D52] underline truncate max-w-[240px]">{place.website}</a>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5">
          <button
            onClick={() => onGetDirections(place)}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-[#2E7D52] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-[#1f5939] active:scale-95 transition-all"
          >
            <Navigation size={14} />
            Directions
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-[#F0F7F4] text-[#1a1a2e] border border-black/10 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-100 active:scale-95 transition-all"
          >
            <Share2 size={14} />
            Share
          </button>
        </div>

        {/* AI Copilot Ask Button */}
        {onAskAIAboutPlace && (
          <button
            onClick={() => onAskAIAboutPlace(place.name)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-[#A594D3]/20 to-[#2E7D52]/20 border border-[#A594D3]/30 rounded-2xl text-xs font-bold text-[#1a1a2e] hover:border-[#2E7D52] transition-all"
          >
            <Sparkles size={14} className="text-[#A594D3]" />
            Ask Copilot about this place
          </button>
        )}
      </div>
    </motion.div>
  );
}
