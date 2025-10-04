import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
  points: [number, number, number][]; // [lat, lng, intensity]
  options?: {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    max?: number;
    minOpacity?: number;
    gradient?: { [key: number]: string };
  };
}

declare module 'leaflet' {
  namespace L {
    function heatLayer(
      latlngs: [number, number, number][],
      options?: any
    ): any;
  }
}

const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ points, options = {} }) => {
  const map = useMap();

  useEffect(() => {
    // Default options
    const defaultOptions = {
      radius: 20,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      minOpacity: 0.4,
      gradient: {
        0.0: '#313695',
        0.1: '#4575b4', 
        0.2: '#74add1',
        0.3: '#abd9e9',
        0.4: '#e0f3f8',
        0.5: '#ffffcc',
        0.6: '#fed976',
        0.7: '#feb24c',
        0.8: '#fd8d3c',
        0.9: '#f03b20',
        1.0: '#bd0026'
      },
      ...options
    };

    // Create heatmap layer
    const heatmapLayer = (L as any).heatLayer(points, defaultOptions);
    
    // Add to map
    heatmapLayer.addTo(map);
    
    // Cleanup function
    return () => {
      if (map.hasLayer(heatmapLayer)) {
        map.removeLayer(heatmapLayer);
      }
    };
  }, [map, points, options]);

  return null;
};

export default HeatmapLayer;
