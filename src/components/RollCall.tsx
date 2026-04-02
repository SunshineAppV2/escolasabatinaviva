import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { BookOpen, Users, Heart, Activity, Check, Printer, ChevronLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';

/**
 * Retorna a data do N-ésimo sábado a partir de uma data de início (inclusive).
 * dayIndex começa em 1.
 */
function getNthSaturday(startDate, dayIndex) {
  const start = new Date(startDate + 'T12:00:00'); // noon evita problema de fuso
  // Avança até o primeiro sábado
  const dayOfWeek = start.getDay(); // 0=Dom, 6=Sáb
  const daysUntilSat = dayOfWeek <= 6 ? (6 - dayOfWeek) % 7 : 0;
  const firstSat = new Date(start);
  firstSat.setDate(start.getDate() + daysUntilSat);
  // Soma as semanas adicionais
  const target = new Date(firstSat);
  target.setDate(firstSat.getDate() + (dayIndex - 1) * 7);
  return target;
}

function RollCall({ user, onBack }) {
  const [activeDay,          setActiveDay]          = useState(1);
  const [activeUnit,         setActiveUnit]         = useState('');
  const [attendance,         setAttendance]         = useState([]);
  const [currentRollCallId,  setCurrentRollCallId]  = useState(null);

  const { toast } = useToast();
  const { data: quartersData } = useFirestore('quarters');

  // Trimestre ativo — determina data de início e ID para os rollCalls
  const activeQuarter = useMemo(
    () => quartersData.find((q) => q.status === 'active') ?? null,
    [quartersData]
  );

  // Filtro de membros: editores de unidade veem só sua unidade
  const memberFilters = useMemo(
    () =>
      (user?.role === 'Professor ES' || user?.role === 'Secretário de Unidade') && user?.unitId
        ? [{ field: 'unitId', op: '==', value: user.unitId }]
        : [],
    [user?.role, user?.unitId]
  );

  // Filtro de rollCalls: apenas do trimestre ativo
  const rollCallFilters = useMemo(
    () =>
      activeQuarter ? [{ field: 'quarterId', op: '==', value: activeQuarter.id }] : [],
    [activeQuarter]
  );

  const { data: membersData }  = useFirestore('members', memberFilters);
  const { data: hierarchyDocs } = useFirestore('hierarchy');
  const {
    data: rollCallsData,
    addItem:    addRollCallItem,
    updateItem: updateRollCallItem,
    error:      rollCallError,
  } = useFirestore('rollCalls', rollCallFilters);

  const members = useMemo(() => membersData || [], [membersData]);

  const units = useMemo(() => {
    const doc = hierarchyDocs[0];
    return doc?.unidades || [];
  }, [hierarchyDocs]);

  // Define unidade inicial conforme papel do usuário
  useEffect(() => {
    if ((user?.role === 'Professor ES' || user?.role === 'Secretário de Unidade') && user?.unitId) {
      setActiveUnit(user.unitId);
    } else if (units.length > 0 && !activeUnit) {
      setActiveUnit(units[0].id);
    }
  }, [units, user]);

  // Carrega attendance para o dia/unidade selecionados
  useEffect(() => {
    const match = rollCallsData.find(
      (doc) => doc.unitId === activeUnit && doc.day === activeDay
    );
    if (match) {
      setCurrentRollCallId(match.id);
      setAttendance(Array.isArray(match.records) ? match.records : []);
    } else {
      setCurrentRollCallId(null);
      setAttendance([]);
    }
  }, [activeDay, activeUnit, rollCallsData]);

  const saveAttendance = useCallback(async (newList) => {
    if (!activeUnit) return;
    if (rollCallError) {
      toast('Erro de conexão. Verifique a internet.', 'error');
      return;
    }

    setAttendance(newList);

    const payload = {
      unitId:    activeUnit,
      day:       activeDay,
      quarterId: activeQuarter?.id ?? null,
      records:   newList,
      date:      new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (currentRollCallId) {
      await updateRollCallItem(currentRollCallId, payload);
    } else {
      const newId = await addRollCallItem(payload);
      if (newId) setCurrentRollCallId(newId);
    }
  }, [activeUnit, activeDay, activeQuarter, currentRollCallId, rollCallError]);

  const toggleStat = useCallback((mId, stat) => {
    const list = [...attendance];
    const idx  = list.findIndex((r) => r.id === mId);
    const record = idx >= 0 ? { ...list[idx] } : { id: mId, unitId: activeUnit };
    record[stat] = !record[stat];
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    saveAttendance(list);
  }, [attendance, activeUnit, saveAttendance]);

  const getDayLabel = useCallback((dayIndex) => {
    if (!activeQuarter?.start) return `${dayIndex}º Sábado`;
    const d = getNthSaturday(activeQuarter.start, dayIndex);
    return d.toLocaleDateString('pt-BR');
  }, [activeQuarter]);

  const EXCLUDED_ROLES = ['Administrador', 'Pastor'];

  const filteredMembers = useMemo(
    () => members.filter(
      (m) => String(m.unitId) === String(activeUnit) && !EXCLUDED_ROLES.includes(m.role)
    ),
    [members, activeUnit]
  );

  const dayStats = useMemo(() => ({
    presents: attendance.filter((r) => r.present).length,
    lessons:  attendance.filter((r) => r.lesson).length,
    pgs:      attendance.filter((r) => r.pg).length,
    missions: attendance.filter((r) => r.mission).length,
  }), [attendance]);

  return (
    <div className="animate-up" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '28px',
        padding: '2rem',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.8rem' }}>
          <div>
            <span style={{
              display: 'inline-flex',
              padding: '0.3rem 0.9rem',
              background: 'rgba(212,175,55,0.1)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: '50px',
              fontSize: '0.7rem',
              fontWeight: 800,
              color: 'var(--secondary)',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginBottom: '0.75rem',
            }}>
              CHAMADA
            </span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 0.3rem' }}>
              Chamada: {activeDay}º Sábado
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: '0.9rem' }}>
              {getDayLabel(activeDay)}
              {activeQuarter ? ` — ${activeQuarter.name}` : ' — Nenhum trimestre ativo'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0, marginLeft: '1.5rem' }}>
            <button
              onClick={onBack}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '0.7rem 1.2rem',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <ChevronLeft size={16} /> Voltar
            </button>
            <button
              onClick={() => window.print()}
              style={{
                background: 'linear-gradient(135deg, #D4AF37, #B08D26)',
                color: '#0a0f2c',
                border: 'none',
                borderRadius: '12px',
                padding: '0.7rem 1.2rem',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Printer size={16} /> Imprimir
            </button>
          </div>
        </div>

        {/* Aviso se não há trimestre ativo */}
        {!activeQuarter && (
          <div style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            color: '#f59e0b',
            fontSize: '0.9rem',
          }}>
            Nenhum trimestre ativo. Ative um em <strong>Ciclos de Apuração</strong> para registrar chamadas.
          </div>
        )}

        {/* Sábados — day tabs */}
        <div className="day-tabs" style={{ marginBottom: '1.5rem' }}>
          {[...Array(13)].map((_, i) => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`${i + 1}º Sábado — ${getDayLabel(i + 1)}`}
              aria-pressed={activeDay === i + 1}
              className={`day-dot ${activeDay === i + 1 ? 'active' : ''}`}
              onClick={() => setActiveDay(i + 1)}
              onKeyDown={(e) => e.key === 'Enter' && setActiveDay(i + 1)}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="stats-summary-grid" style={{ marginBottom: '1.5rem' }}>
          {[
            { label: 'Presença',   value: dayStats.presents, color: 'blue',   Icon: Users },
            { label: 'Lição',      value: dayStats.lessons,  color: 'green',  Icon: BookOpen },
            { label: 'Peq. Grupo', value: dayStats.pgs,      color: 'orange', Icon: Heart },
            { label: 'Missão',     value: dayStats.missions, color: 'purple', Icon: Activity },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} className={`status-mini-card ${color}`}>
              <div className="icon-glow"><Icon size={20} /></div>
              <div className="info">
                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{label}</span>
                <strong style={{ display: 'block', fontSize: '1.2rem' }}>{value}</strong>
              </div>
            </div>
          ))}
        </div>

        {/* Seletor de unidade (admin/pastor/diretor — editores de unidade têm unidade fixa) */}
        {user?.role !== 'Professor ES' && user?.role !== 'Secretário de Unidade' && units.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            padding: '0.4rem',
            marginBottom: '1.5rem',
            position: 'relative',
          }}>
            <select
              aria-label="Selecionar unidade"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '1rem 1.2rem',
                color: 'var(--secondary)',
                fontWeight: 800,
                fontSize: '1rem',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                fontFamily: 'inherit',
              }}
              value={activeUnit}
              onChange={(e) => setActiveUnit(e.target.value)}
            >
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}

        {/* Tabela de chamada */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {['Participante', 'Presença', 'Estudo', 'P.G.', 'Missão'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: '1rem 1.2rem',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: 'rgba(255,255,255,0.35)',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      textAlign: i === 0 ? 'left' : 'center',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: 'center',
                      padding: '3rem',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '0.9rem',
                    }}
                  >
                    Nenhum membro nesta unidade.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const record = attendance.find((r) => r.id === m.id) || {};
                  return (
                    <tr key={m.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.9rem 1.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            background: 'rgba(212,175,55,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            color: 'var(--secondary)',
                            flexShrink: 0,
                          }}>
                            {m.name.charAt(0)}
                          </div>
                          <strong style={{ fontSize: '0.9rem' }}>{m.name}</strong>
                        </div>
                      </td>

                      {[
                        { stat: 'present', color: 'var(--accent-blue)',  Icon: Check    },
                        { stat: 'lesson',  color: 'var(--accent-green)', Icon: BookOpen },
                        { stat: 'pg',      color: '#f59e0b',             Icon: Users    },
                        { stat: 'mission', color: '#a855f7',             Icon: Heart    },
                      ].map(({ stat, color, Icon }) => (
                        <td key={stat} style={{ textAlign: 'center', padding: '0.9rem 1.2rem' }}>
                          <button
                            aria-label={`${stat} — ${m.name}`}
                            aria-pressed={!!record[stat]}
                            onClick={() => toggleStat(m.id, stat)}
                            style={{
                              cursor: 'pointer',
                              display: 'inline-flex',
                              padding: '0.65rem',
                              background: record[stat] ? color : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${record[stat] ? color : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: '10px',
                              color: record[stat] ? 'white' : 'rgba(255,255,255,0.25)',
                            }}
                          >
                            <Icon size={18} />
                          </button>
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default RollCall;
