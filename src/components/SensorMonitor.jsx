import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronDown, ChevronUp, X, AlertTriangle, CheckCircle2, Thermometer, Wind, Layers, Play, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Normal operating ranges per sensor
const SENSOR_DEFAULTS = {
  nozzle_temp: { label: 'Nozzle Temp', unit: '°C', icon: Thermometer, target: 200, tolerance: 10, color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  bed_temp:    { label: 'Bed Temp',    unit: '°C', icon: Layers,      target: 60,  tolerance: 5,  color: 'text-cyan-400',   bg: 'bg-cyan-500/15 border-cyan-500/30' },
  fan_speed:   { label: 'Fan Speed',   unit: '%',  icon: Wind,        target: 100, tolerance: 15, color: 'text-teal-400',   bg: 'bg-teal-500/15 border-teal-500/30' },
};

const ALERT_COOLDOWN_MS = 15000; // don't re-alert same sensor within 15s

function SensorRow({ sensorKey, config, value, target, tolerance, onChange, anomaly }) {
  const Icon = config.icon;
  const pct = target > 0 ? Math.min(100, (value / (target * 1.4)) * 100) : 0;
  const deviation = Math.abs(value - target);
  const deviationPct = target > 0 ? Math.round((deviation / target) * 100) : 0;

  return (
    <div className={cn('rounded-xl border p-3 space-y-2 transition-colors', anomaly ? 'bg-red-500/10 border-red-500/40' : 'bg-slate-800/50 border-slate-700/40')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-3.5 h-3.5', anomaly ? 'text-red-400' : config.color)} />
          <span className="text-xs font-medium text-slate-300">{config.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {anomaly && <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" />}
          <span className={cn('text-xs font-bold', anomaly ? 'text-red-300' : 'text-white')}>
            {value}{config.unit}
          </span>
        </div>
      </div>

      {/* Gauge bar */}
      <div className="relative w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
        {/* Target zone */}
        <div className="absolute h-full bg-green-500/30 rounded-full"
          style={{
            left: `${Math.max(0, ((target - tolerance) / (target * 1.4)) * 100)}%`,
            width: `${((tolerance * 2) / (target * 1.4)) * 100}%`
          }} />
        <div className={cn('h-full rounded-full transition-all', anomaly ? 'bg-red-500' : config.color.replace('text-', 'bg-').replace('-400', '-500'))}
          style={{ width: `${pct}%` }} />
      </div>

      {/* Input + target */}
      <div className="flex items-center gap-2">
        <input type="range" min={0} max={Math.round(target * 1.6)}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 h-1 accent-cyan-500 cursor-pointer"
        />
        <input type="number" value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white text-center focus:outline-none focus:border-cyan-500/60"
        />
      </div>
      <p className="text-[10px] text-slate-600">
        Target: {target}{config.unit} ± {tolerance}{config.unit}
        {anomaly && <span className="text-red-400 ml-2">⚠ {deviationPct}% off target</span>}
      </p>
    </div>
  );
}

export default function SensorMonitor() {
  const [open, setOpen] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [values, setValues] = useState({ nozzle_temp: 200, bed_temp: 60, fan_speed: 100 });
  const [targets, setTargets] = useState({ nozzle_temp: 200, bed_temp: 60, fan_speed: 100 });
  const [tolerances] = useState({ nozzle_temp: 10, bed_temp: 5, fan_speed: 15 });
  const [anomalies, setAnomalies] = useState({});
  const [printName, setPrintName] = useState('');
  const lastAlertTime = useRef({});
  const checkInterval = useRef(null);

  const checkAnomalies = useCallback((currentValues) => {
    const newAnomalies = {};
    let hasNewAlert = false;

    Object.keys(SENSOR_DEFAULTS).forEach(key => {
      const val = currentValues[key];
      const target = targets[key];
      const tol = tolerances[key];
      const deviation = Math.abs(val - target);
      const isAnomaly = deviation > tol;
      newAnomalies[key] = isAnomaly;

      if (isAnomaly) {
        const now = Date.now();
        const lastAlert = lastAlertTime.current[key] || 0;
        if (now - lastAlert > ALERT_COOLDOWN_MS) {
          lastAlertTime.current[key] = now;
          hasNewAlert = true;
          const cfg = SENSOR_DEFAULTS[key];
          const direction = val > target ? 'too high' : 'too low';
          const severity = deviation > tol * 2 ? 'critical' : 'warning';
          if (severity === 'critical') {
            toast.error(`🚨 ${cfg.label} anomaly${printName ? ` — ${printName}` : ''}`, {
              description: `${val}${cfg.unit} (target ${target}${cfg.unit}) — ${direction} by ${Math.round(deviation)}${cfg.unit}`,
              duration: 8000,
            });
          } else {
            toast.warning(`⚠️ ${cfg.label} deviation${printName ? ` — ${printName}` : ''}`, {
              description: `${val}${cfg.unit} (target ${target}${cfg.unit}) — ${direction} by ${Math.round(deviation)}${cfg.unit}`,
              duration: 6000,
            });
          }
        }
      }
    });

    setAnomalies(newAnomalies);
  }, [targets, tolerances, printName]);

  // Check on value change when monitoring
  useEffect(() => {
    if (monitoring) checkAnomalies(values);
  }, [values, monitoring, checkAnomalies]);

  // Periodic re-check every 5s while monitoring
  useEffect(() => {
    if (monitoring) {
      checkInterval.current = setInterval(() => checkAnomalies(values), 5000);
    } else {
      clearInterval(checkInterval.current);
      setAnomalies({});
    }
    return () => clearInterval(checkInterval.current);
  }, [monitoring]);

  const startMonitoring = () => {
    setMonitoring(true);
    toast.success(`Monitoring started${printName ? ` — ${printName}` : ''}`, { description: 'Alerts will fire if sensors deviate from targets.' });
  };

  const stopMonitoring = () => {
    setMonitoring(false);
    toast.info('Monitoring stopped');
    lastAlertTime.current = {};
  };

  const anomalyCount = Object.values(anomalies).filter(Boolean).length;

  return (
    <div className="fixed bottom-20 right-3 z-40" style={{ bottom: 'calc(64px + env(safe-area-inset-bottom) + 8px)' }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="mb-2 w-72 bg-slate-900/98 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className={cn('w-4 h-4', monitoring ? 'text-green-400 animate-pulse' : 'text-slate-500')} />
                <span className="text-sm font-semibold text-white">Live Sensor Monitor</span>
                {anomalyCount > 0 && (
                  <span className="text-xs bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">{anomalyCount}</span>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
              {/* Print name */}
              <input value={printName} onChange={e => setPrintName(e.target.value)}
                placeholder="Print name (optional)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60" />

              {/* Target overrides */}
              <div className="grid grid-cols-3 gap-1.5">
                {Object.keys(SENSOR_DEFAULTS).map(key => {
                  const cfg = SENSOR_DEFAULTS[key];
                  return (
                    <div key={key} className="flex flex-col items-center bg-slate-800 border border-slate-700 rounded-lg p-1.5 gap-0.5">
                      <p className="text-[9px] text-slate-500 uppercase">{cfg.label.split(' ')[0]}</p>
                      <input type="number" value={targets[key]}
                        onChange={e => setTargets(t => ({ ...t, [key]: Number(e.target.value) }))}
                        className="w-full bg-transparent text-center text-xs font-bold text-cyan-400 focus:outline-none"
                      />
                      <p className="text-[9px] text-slate-600">target</p>
                    </div>
                  );
                })}
              </div>

              {/* Sensors */}
              {Object.keys(SENSOR_DEFAULTS).map(key => (
                <SensorRow key={key} sensorKey={key} config={SENSOR_DEFAULTS[key]}
                  value={values[key]} target={targets[key]} tolerance={tolerances[key]}
                  anomaly={anomalies[key]}
                  onChange={v => setValues(prev => ({ ...prev, [key]: v }))}
                />
              ))}

              {/* Control */}
              <button
                onClick={monitoring ? stopMonitoring : startMonitoring}
                className={cn('w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all',
                  monitoring
                    ? 'bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30'
                    : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white'
                )}>
                {monitoring ? <><Square className="w-3.5 h-3.5" /> Stop Monitoring</> : <><Play className="w-3.5 h-3.5" /> Start Monitoring</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors relative',
          monitoring && anomalyCount > 0
            ? 'bg-red-500 hover:bg-red-400'
            : monitoring
            ? 'bg-green-600 hover:bg-green-500'
            : 'bg-slate-700 hover:bg-slate-600'
        )}>
        <Activity className="w-5 h-5 text-white" />
        {monitoring && anomalyCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 border-2 border-slate-900 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
            {anomalyCount}
          </span>
        )}
        {monitoring && anomalyCount === 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 border-2 border-slate-900 rounded-full animate-pulse" />
        )}
      </motion.button>
    </div>
  );
}