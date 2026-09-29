import fs from 'node:fs';
import path from 'node:path';

const content = `import 'reflect-metadata';
import { sequelize } from '../shared/database/sequelize.js';
import { UserModel } from '../modules/user/models/user.model.js';
import { ProfileModel } from '../modules/user/models/profile.model.js';
import { DriverProfileModel } from '../modules/driver/models/driver.model.js';
import { VehicleModel } from '../modules/driver/models/vehicle.model.js';
import { ServiceTypeRepository } from '../modules/pricing/repositories/service-type.repository.js';
import { FareCalculatorService } from '../modules/pricing/services/fare-calculator.service.js';
import { TripRepository } from '../modules/trips/repositories/trip.repository.js';
import { TripPaymentService } from '../modules/trips/services/trip-payment.service.js';
import { DriverLocationRepository } from '../modules/location/repositories/driver-location.repository.js';
import { dispatchRepository } from '../modules/dispatch/repositories/dispatch.repository.js';
import { OutboxEventModel } from '../modules/dispatch/models/Outboxevent.model.js';
import { TripModel } from '../modules/trips/models/trip.model.js';
import { mapOfferToDTO } from '../modules/dispatch/repositories/dispatch.mapper.js';
import { mapsProvider } from '../modules/maps/services/geoapify-routing.service.js';
import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';

async function run() {
  console.log('1. Cancelando viajes anteriores activos y ofertas pendientes...');
  await sequelize.query(
    "UPDATE app.trips SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason_code = 'driver_cancelled' WHERE status NOT IN ('completed', 'cancelled')"
  );
  await sequelize.query(
    "UPDATE app.trip_driver_offers SET status = 'expired', responded_at = NOW() WHERE status = 'offered'"
  );
  await sequelize.query(
    "UPDATE app.outbox_events SET status = 'sent' WHERE status = 'pending'"
  );
  console.log('Viajes anteriores cancelados.');

  console.log('2. Configurando conductores (solo conductor real online)...');
  const MAIN_DRIVER_ID = '645b08f9-93b5-48a9-93d8-ec376107c57e';
  await DriverProfileModel.update(
    { availabilityStatus: 'offline' as any },
    { where: { id: { [Op.ne]: MAIN_DRIVER_ID } } }
  );
  await DriverProfileModel.update(
    { availabilityStatus: 'online' as any },
    { where: { id: MAIN_DRIVER_ID } }
  );

  const LOCATION = { latitude: -31.4453, longitude: -64.1195 };
  const DESTINATION = { latitude: -31.4250, longitude: -64.1870 };
  await DriverLocationRepository.upsertLocation(MAIN_DRIVER_ID, LOCATION.latitude, LOCATION.longitude);

  const driverProfiles = await DriverProfileModel.findAll({
    where: { id: MAIN_DRIVER_ID }
  });
  console.log(\`Conductor principal listo: \${MAIN_DRIVER_ID}\`);

  const driverIds = driverProfiles.map((d) => d.id);
  let passenger = await UserModel.findOne({
    where: { 
      id: { [Op.notIn]: driverIds },
    }
  });

  if (!passenger) {
    passenger = await UserModel.findOne();
  }
  console.log('Pasajero seleccionado:', passenger?.emailNormalized);

  await ProfileModel.upsert({
    id: passenger!.id,
    firstName: 'Martín',
    lastName: 'Benítez',
    gender: 'male',
    phoneE164: '+5491112345678',
    status: 'active',
  });

  console.log('3. Calculando ruta real con Geoapify...');
  const route = await mapsProvider.calculateRoute(
    { latitude: LOCATION.latitude, longitude: LOCATION.longitude },
    { latitude: DESTINATION.latitude, longitude: DESTINATION.longitude }
  );
  console.log(\`Ruta obtenida: \${route.distanceMeters}m, \${route.durationSeconds}s, \${route.geometry.coordinates[0]?.length ?? 0} waypoints.\`);

  const rules = await ServiceTypeRepository.findActiveFareRules();
  const fares = rules.map((r) => FareCalculatorService.calculate(route.distanceMeters, r));

  const draft = await TripRepository.createDraftWithQuotes({
    userId: passenger!.id,
    request: {
      origin: {
        address_text: 'Av. Amadeo Sabattini 4200, B° Deán Funes',
        place_id: 'Barrio Dean Funes',
        latitude: LOCATION.latitude,
        longitude: LOCATION.longitude,
      },
      destination: {
        address_text: 'Av. Hipólito Yrigoyen 325, Nueva Córdoba',
        place_id: 'Nueva Cordoba',
        latitude: DESTINATION.latitude,
        longitude: DESTINATION.longitude,
      },
    },
    route,
    fares,
    expiresAt: new Date(Date.now() + 300 * 1000),
  });

  console.log('Draft creado:', draft.tripId);

  console.log('4. Confirmando viaje con PIN requerido y efectivo...');
  const confirmed = await TripPaymentService.confirmTrip(passenger!.id, draft.tripId, randomUUID(), {
    fare_quote_id: draft.quoteIds[0],
    payment: { type: 'cash' },
    require_pin: true,
  });

  const boardingPin = confirmed.body.trip.boarding_pin || '4821';
  console.log('Viaje confirmado con PIN:', confirmed.body.trip.require_pin, 'Boarding PIN:', boardingPin);

  console.log('5. Despachando ofertas...');
  const trip = await TripModel.findByPk(draft.tripId);
  if (!trip) throw new Error('Trip no encontrado');
  trip.status = 'searching';
  trip.searchingAt = new Date();
  await trip.save();

  let offerDTOs: any[] = [];
  await sequelize.transaction(async (tx) => {
    const offers = await dispatchRepository.createOffers(
      draft.tripId,
      driverProfiles.map((dp) => ({ driverId: dp.id, userId: dp.id, distanceMeters: 250 })),
      tx
    );
    offerDTOs = offers.map(mapOfferToDTO);

    const outboxPayload = {
      tripId: draft.tripId,
      offers: offerDTOs,
      tripDetails: {
        ttlSeconds: 60,
        routeGeometry: trip.routeGeometry ?? null,
        require_pin: true,
        boarding_pin: boardingPin,
        fare: {
          netEarnings: 4200,
          totalFare: 5000,
          commission: 800,
          currency: 'ARS',
          paymentMethod: 'cash',
        },
        pickup: {
          address: 'Av. Amadeo Sabattini 4200, B° Deán Funes',
          subtitle: 'Barrio Deán Funes, Córdoba Capital',
          latitude: LOCATION.latitude,
          longitude: LOCATION.longitude,
          etaMinutes: 2,
        },
        dropoff: {
          address: 'Av. Hipólito Yrigoyen 325, Nueva Córdoba',
          subtitle: 'Nueva Córdoba, Córdoba Capital',
          latitude: DESTINATION.latitude,
          longitude: DESTINATION.longitude,
          durationMinutes: Math.ceil(route.durationSeconds / 60),
        },
        passenger: {
          fullName: 'Martín Benítez',
          rating: 4.98,
          completedTrips: 42,
          category: 'Black VIP',
          preferences: ['Silencio', '21°C', '2 valijas'],
        },
      },
    };

    await OutboxEventModel.create({
      aggregateType: 'trip',
      aggregateId: draft.tripId,
      eventType: 'trip.driver_offers_created',
      payload: outboxPayload,
      status: 'pending',
    }, { transaction: tx });
  });

  console.log('====================================================');
  console.log('EXITO: Oferta de viaje despachada');
  console.log('Trip ID:', draft.tripId);
  console.log('Require PIN:', true);
  console.log('Boarding PIN:', boardingPin);
  console.log('Preferencias:', ['Silencio', '21°C', '2 valijas']);
  console.log('Ofertas creadas para:', driverProfiles.length, 'conductores');
  console.log('====================================================');
  process.exit(0);
}

run().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
`;

const targetPath = path.resolve('../Transfer-Black/backend/src/scripts/dispatch-test-offer.ts');
fs.writeFileSync(targetPath, content, 'utf8');
console.log('Script updated at', targetPath);
