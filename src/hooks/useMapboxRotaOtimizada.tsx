import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface LatLng {
  lat: number;
  lng: number;
}

interface RotaOtimizada {
  geometry: any;
  ordem_otimizada: number[];
  distancia_total_km: number;
  tempo_total_min: number;
  segmentos: Array<{
    distancia_km: number;
    tempo_min: number;
  }>;
}

export const useMapboxRotaOtimizada = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();

  const calcularRotaOtimizada = async (waypoints: LatLng[]): Promise<RotaOtimizada | null> => {
    if (waypoints.length < 2) {
      toast({
        title: 'Erro ao calcular rota',
        description: 'É necessário pelo menos 2 endereços para calcular uma rota.',
        variant: 'destructive'
      });
      return null;
    }

    setIsCalculating(true);

    try {
      const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
      
      if (!MAPBOX_TOKEN) {
        throw new Error('Token do Mapbox não configurado');
      }

      // Formatar coordenadas para a API
      const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
      const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coords}?access_token=${MAPBOX_TOKEN}&overview=full&geometries=geojson`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Erro ao calcular rota otimizada');
      }

      const data = await response.json();

      if (!data.trips || data.trips.length === 0) {
        throw new Error('Nenhuma rota encontrada');
      }

      const trip = data.trips[0];

      return {
        geometry: trip.geometry,
        ordem_otimizada: data.waypoints.map((w: any) => w.waypoint_index),
        distancia_total_km: Math.round(trip.distance / 1000 * 10) / 10,
        tempo_total_min: Math.round(trip.duration / 60),
        segmentos: trip.legs.map((leg: any) => ({
          distancia_km: Math.round(leg.distance / 1000 * 10) / 10,
          tempo_min: Math.round(leg.duration / 60)
        }))
      };
    } catch (error) {
      console.error('Erro ao calcular rota:', error);
      toast({
        title: 'Erro ao calcular rota',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsCalculating(false);
    }
  };

  const geocodeEndereco = async (endereco: string): Promise<LatLng | null> => {
    try {
      const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
      
      if (!MAPBOX_TOKEN) {
        throw new Error('Token do Mapbox não configurado');
      }

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(endereco)}.json?access_token=${MAPBOX_TOKEN}&country=BR&limit=1`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Erro ao geocodificar endereço');
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        throw new Error('Endereço não encontrado');
      }

      const [lng, lat] = data.features[0].center;
      
      return { lat, lng };
    } catch (error) {
      console.error('Erro ao geocodificar:', error);
      toast({
        title: 'Erro ao buscar coordenadas',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
      return null;
    }
  };

  return {
    calcularRotaOtimizada,
    geocodeEndereco,
    isCalculating
  };
};