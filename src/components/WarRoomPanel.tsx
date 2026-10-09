import { useMemo } from "react";
import { useGameStore } from "../store/useGameStore";

export function WarRoomPanel() {
  const factions = useGameStore((state) => state.factions);
  const incidents = useGameStore((state) => state.incidents);
  const wars = useGameStore((state) => state.wars);
  const tick = useGameStore((state) => state.tick);
  const selectFaction = useGameStore((state) => state.selectFaction);

  const byId = useMemo(
    () => new Map(factions.map((faction) => [faction.id, faction])),
    [factions]
  );

  const activeWars = wars
    .filter((war) => war.status !== "ended")
    .slice()
    .reverse();
  const recentIncidents = incidents.slice(-5).reverse();
  const occupiedCount = factions.filter((faction) => Boolean(faction.controlledBy)).length;
  const empireCounts = new Map<string, number>();
  for (const faction of factions) {
    if (!faction.controlledBy) continue;
    empireCounts.set(
      faction.controlledBy,
      (empireCounts.get(faction.controlledBy) ?? 0) + 1
    );
  }
  const topEmpire = [...empireCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ faction: byId.get(id), count }))
    .find((entry) => entry.faction);

  return (
    <section className="panel war-room-panel">
      <div className="panel-title-row">
        <div>
          <div className="eyebrow">WORLD CONQUEST</div>
          <strong>War Room</strong>
        </div>
        <span className="war-count">{activeWars.length} active</span>
      </div>

      <div className="conquest-summary">
        <div>
          <span>Sovereign</span>
          <strong>{factions.length - occupiedCount}</strong>
        </div>
        <div>
          <span>Occupied</span>
          <strong>{occupiedCount}</strong>
        </div>
        <div>
          <span>Largest empire</span>
          <strong>
            {topEmpire?.faction
              ? `${topEmpire.faction.emoji} ${topEmpire.faction.name} +${topEmpire.count}`
              : "None"}
          </strong>
        </div>
      </div>

      {activeWars.length === 0 && (
        <div className="empty-state">
          No active war. Tension and incidents can still build before a conflict.
        </div>
      )}

      <div className="war-card-list">
        {activeWars.slice(0, 5).map((war) => {
          const incident = incidents.find(
            (item) => item.id === war.causeIncidentId
          );
          const attacker = byId.get(war.primaryAttackerId);
          const defender = byId.get(war.primaryDefenderId);
          const maxFront = Math.max(
            0,
            ...Object.values(war.frontProgress ?? {})
          );

          return (
            <article key={war.id} className={`war-card ${war.status}`}>
              <div className="war-card-head">
                <strong>{war.name}</strong>
                <span>{war.status.replace("-", " ").toUpperCase()}</span>
              </div>

              {incident && (
                <div className="war-cause">
                  <span>WHY IT STARTED</span>
                  <strong>{incident.title}</strong>
                  <p>{incident.description}</p>
                </div>
              )}

              {war.status === "mobilizing" && (
                <div className="mobilization-countdown">
                  Combat in {Math.max(0, war.startsTick - tick)} ticks
                </div>
              )}

              <div className="coalition-grid">
                <div>
                  <span>{war.attackerAllianceName ?? "Attacking side"}</span>
                  {war.attackerIds.slice(0, 6).map((id) => {
                    const faction = byId.get(id);
                    if (!faction) return null;
                    return (
                      <button key={id} onClick={() => selectFaction(id)}>
                        {faction.emoji} {faction.name}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <span>{war.defenderAllianceName ?? "Defending side"}</span>
                  {war.defenderIds.slice(0, 6).map((id) => {
                    const faction = byId.get(id);
                    if (!faction) return null;
                    return (
                      <button key={id} onClick={() => selectFaction(id)}>
                        {faction.emoji} {faction.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {war.status === "war" && attacker && defender && (
                <div className="front-meter">
                  <div>
                    <span>
                      Front: {attacker.name} → {defender.name}
                    </span>
                    <strong>{Math.round(maxFront)}%</strong>
                  </div>
                  <div className="front-meter-track">
                    <span style={{ width: `${Math.min(100, maxFront)}%` }} />
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {recentIncidents.length > 0 && (
        <>
          <div className="section-label">Recent crises</div>
          <div className="incident-list">
            {recentIncidents.map((incident) => (
              <div key={incident.id}>
                <strong>{incident.title}</strong>
                <span>
                  severity {incident.severity} · tick {incident.createdTick}
                  {incident.resolved ? " · resolved" : " · unresolved"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
