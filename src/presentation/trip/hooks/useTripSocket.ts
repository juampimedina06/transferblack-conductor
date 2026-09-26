import { useEffect } from 'react';
import { socket } from '../../../core/socket/socket';
import { useDriverTripStore } from '../store/useDriverTripStore';
import { TripOfferPayload } from '../../../core/trip/interface/trip.interface';

export const useTripSocket = () => {
  const setCurrentOffer = useDriverTripStore((state) => state.setCurrentOffer);

  useEffect(() => {
    const handleNewOffer = (payload: TripOfferPayload) => {
      // payload will now include tripDetails flattened thanks to the backend changes
      setCurrentOffer(payload);
    };

    socket.on('trip:offer', handleNewOffer);

    return () => {
      socket.off('trip:offer', handleNewOffer);
    };
  }, []);
};
