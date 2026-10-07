import { LegalContract } from '../interface/legal.interface';

export const CURRENT_LEGAL_TERMS_VERSION = '2026.1';

export const DRIVER_LEGAL_CONTRACT: LegalContract = {
  version: CURRENT_LEGAL_TERMS_VERSION,
  effectiveDate: '2026-10-01',
  jurisdiction: 'Ciudad de Córdoba, Provincia de Córdoba, República Argentina',
  title: 'Contrato de Intermediación Tecnológica y Deslinde de Responsabilidad',
  subtitle: 'Términos y Condiciones para Conductores Independientes — TransferBlack',
  clauses: [
    {
      id: 'clause-1-intermediation',
      title: '1. Naturaleza del Servicio e Intermediación Tecnológica',
      summary: 'TransferBlack actúa únicamente como intermediario digital entre conductores independientes y pasajeros.',
      content:
        'TransferBlack es una plataforma tecnológica de intermediación digital y solución de software que conecta a conductores independientes prestadores del servicio de traslado con usuarios pasajeros. El Conductor reconoce y acepta que no existe relación laboral, de empleo ni de subordinación jurídica entre el Conductor y TransferBlack, actuando el Conductor en todo momento de manera autónoma, con vehículo propio o autorizado, asumiendo su propio riesgo empresario.',
      important: true,
    },
    {
      id: 'clause-2-accident-liability',
      title: '2. Deslinde de Responsabilidad ante Siniestros Viales y Accidentes',
      summary: 'La plataforma no responde por daños o lesiones derivadas de la conducción. El chofer debe tener seguro al día.',
      content:
        'El Conductor asume en forma personal, exclusiva e indelegable la responsabilidad civil, contravencional y penal derivada del uso, tenencia y conducción del vehículo asignado a los viajes. El Conductor se obliga a mantener vigente y abonada la póliza de seguro automotor con cobertura para terceros y personas transportadas, así como la Inspección Técnica Vehicular (ITV/VTV). TransferBlack no responderá por daños patrimoniales, lesiones, incapacidad o muerte resultantes de siniestros viales ocurridos antes, durante o después de un viaje.',
      important: true,
    },
    {
      id: 'clause-3-security-force-majeure',
      title: '3. Seguridad, Hechos Delictivos y Límites de Responsabilidad',
      summary: 'Las herramientas SOS y geolocalización son asistenciales; la plataforma no responde patrimonialmente por robos o ilícitos.',
      content:
        'TransferBlack provee herramientas tecnológicas preventivas (geolocalización GPS, botón SOS de emergencia y enlace a servicios públicos como 911). No obstante, la plataforma no asume responsabilidad patrimonial ni indemnizatoria frente a hechos delictivos cometidos por terceros o pasajeros (robos, hurtos, agresiones o daños materiales al vehículo), ni por supuestos de caso fortuito o fuerza mayor.',
      important: true,
    },
    {
      id: 'clause-4-driver-obligations',
      title: '4. Obligaciones y Documentación del Conductor',
      summary: 'El conductor debe mantener carnet, seguro, tarjeta identificatoria e ITV al día sin excepción.',
      content:
        'El Conductor se compromete a: (a) Portar Licencia Nacional de Conducir profesional vigente habilitante; (b) Mantener Cédula Verde o Azul, Póliza de Seguro vigente con constancia de pago y certificado ITV/VTV al día; (c) Conservar el vehículo en condiciones óptimas de seguridad, higiene y confort; y (d) Cumplir estrictamente la Ley Nacional de Tránsito N° 24.449 y normativas municipales aplicables.',
    },
    {
      id: 'clause-5-fare-transparency',
      title: '5. Transparencia de Ganancias, Tarifas y Comisiones',
      summary: 'Desglose detallado al finalizar cada viaje: importe pagado, comisión de plataforma y ganancia neta.',
      content:
        'Al culminar cada trayecto, la aplicación exhibirá el desglose íntegro del viaje: tarifa total abonada por el pasajero, porcentaje retenido por TransferBlack en concepto de comisión por intermediación tecnológica, y ganancia neta asignada al Conductor. Las liquidaciones se efectivizarán conforme al calendario y medios de pago informados en la Billetera del Conductor.',
    },
    {
      id: 'clause-6-cancellation-policy',
      title: '6. Políticas de Cancelación Transparente y Prevención de Abuso',
      summary: 'Cancelaciones justificadas no penalizan. Cancelaciones arbitrarias reiteradas activan pausa de 15 minutos.',
      content:
        'El Conductor no será penalizado cuando cancele por motivos justificados comprobables: (a) Si transcurrieron más de 5 minutos de cortesía en el punto de recogida sin que el pasajero se presente; (b) Si la cantidad de personas o equipaje excede la capacidad reglamentaria del rodado; o (c) Ante situaciones evidentes de riesgo para la seguridad. Por el contrario, cancelaciones injustificadas reiteradas activarán una pausa preventiva de despacho de 15 minutos para proteger la confiabilidad del ecosistema.',
      important: true,
    },
  ],
};
