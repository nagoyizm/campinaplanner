import React from 'react';

export default function SandboxPlannerPage() {
  return (
    <>
      <header className="sb-header">
        <h1>Vista de Operaciones</h1>
        <div style={{display: 'flex', gap: '12px'}}>
          <button className="sb-button secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            Buscar
          </button>
          <button className="sb-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Nueva Reserva
          </button>
        </div>
      </header>

      <div className="sb-content">
        <div className="sb-metrics">
          <div className="sb-metric-card">
            <span className="sb-metric-title">Ocupación Actual</span>
            <span className="sb-metric-value">84%</span>
          </div>
          <div className="sb-metric-card">
            <span className="sb-metric-title">Ingresos Proyectados</span>
            <span className="sb-metric-value" style={{color: 'var(--color-accent)'}}>$1.240.000</span>
          </div>
          <div className="sb-metric-card">
            <span className="sb-metric-title">Llegadas Hoy</span>
            <span className="sb-metric-value">12</span>
          </div>
        </div>

        <div className="sb-card">
          <div className="sb-calendar-header">
            <div>LUN 15</div>
            <div>MAR 16</div>
            <div>MIÉ 17</div>
            <div>JUE 18</div>
            <div>VIE 19</div>
            <div>SÁB 20</div>
            <div>DOM 21</div>
          </div>
          
          <div className="sb-grid" style={{marginTop: 0}}>
            <div className="sb-day-col">
              <div className="sb-event">
                <div className="sb-event-time">10:00 - 12:00</div>
                <h3 className="sb-event-title">Check-in: Familia Pérez</h3>
              </div>
            </div>
            <div className="sb-day-col">
              <div className="sb-event accent">
                <div className="sb-event-time">14:00 - 18:00</div>
                <h3 className="sb-event-title">Mantenimiento Cabaña 3</h3>
              </div>
            </div>
            <div className="sb-day-col">
              <div className="sb-event">
                <div className="sb-event-time">11:00 - 15:00</div>
                <h3 className="sb-event-title">Tour: Grupo Escolar</h3>
              </div>
            </div>
            <div className="sb-day-col"></div>
            <div className="sb-day-col">
              <div className="sb-event">
                <div className="sb-event-time">09:00 - 11:00</div>
                <h3 className="sb-event-title">Check-out: R. Gómez</h3>
              </div>
            </div>
            <div className="sb-day-col"></div>
            <div className="sb-day-col"></div>
          </div>
        </div>
      </div>
    </>
  );
}
