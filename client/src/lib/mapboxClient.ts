import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set your Mapbox access token here (fallback to a default for development)
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiZ3ltYnVkZHkiLCJhIjoiY2txMnlvdHNtMDNpZDJ1cGVwcjJyMTJvYiJ9.lN9OkTFtPkzoH6E5QfXbjA";

// Calculate distance between two points using Haversine formula
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c;
  return distance;
};

// Create a Mapbox marker element
export const createMarkerElement = (user: any, isCurrentUser: boolean = false): HTMLElement => {
  const el = document.createElement('div');
  el.className = 'relative';
  
  const markerEl = document.createElement('div');
  markerEl.className = `w-10 h-10 ${isCurrentUser ? 'bg-accent' : 'bg-primary'} rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg`;
  
  // Add text inside marker
  if (isCurrentUser) {
    markerEl.innerHTML = '<span class="font-medium">You</span>';
  } else {
    markerEl.innerHTML = `<span>${user.name ? user.name.charAt(0) : '?'}</span>`;
    
    // Add indicator dot for workout match
    const indicatorEl = document.createElement('div');
    indicatorEl.className = 'absolute -bottom-1 -right-1 w-4 h-4 bg-secondary rounded-full border border-white';
    el.appendChild(indicatorEl);
  }
  
  el.appendChild(markerEl);
  return el;
};

// Create a marker popup
export const createMarkerPopup = (user: any): mapboxgl.Popup => {
  return new mapboxgl.Popup({ offset: 25 })
    .setHTML(`
      <div class="p-2">
        <h3 class="font-semibold">${user.name}</h3>
        <p class="text-xs text-gray-600">${user.experienceLevel} (${user.experienceYears} years)</p>
        ${user.workoutType ? `<p class="text-xs text-green-600">Working on: ${formatWorkoutType(user.workoutType)}</p>` : ''}
      </div>
    `);
};

// Format workout type for display
export const formatWorkoutType = (type: string): string => {
  return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
};

// Helper function to convert degrees to radians
const toRadians = (degrees: number): number => {
  return degrees * Math.PI / 180;
};

export default mapboxgl;
