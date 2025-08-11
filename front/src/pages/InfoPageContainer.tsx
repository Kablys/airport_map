import React from 'react';
import { InfoPage } from '../components/InfoPage.tsx';
import { ryanairAirports, ryanairRoutes } from '../data.ts';
import type { Airport } from '../types.ts';

type Props = {
  onAirportClick: (airport: Airport) => void;
};

export const InfoPageContainer: React.FC<Props> = ({ onAirportClick }) => {
  return (
    <div id="info-page" className="page active">
      <div id="info-page-container">
        <InfoPage airports={ryanairAirports} routes={ryanairRoutes} onAirportClick={onAirportClick} />
      </div>
    </div>
  );
};
