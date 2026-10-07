import { useGameStore } from "../store/useGameStore";

export function QuestPanel() {
  const quests = useGameStore((state) => state.quests);

  return (
    <section className="panel quest-panel">
      <div className="panel-title-row">
        <div>
          <div className="eyebrow">WORLD OBJECTIVES</div>
          <strong>Quests & domination</strong>
        </div>
        <span className="quest-total">
          {quests.filter((quest) => quest.completed).length}/{quests.length}
        </span>
      </div>

      <div className="quest-list">
        {quests.map((quest) => {
          const ratio = Math.min(1, quest.progress / Math.max(1, quest.target));
          return (
            <div
              key={quest.id}
              className={quest.completed ? "quest-card completed" : "quest-card"}
            >
              <div className="quest-title-row">
                <strong>{quest.completed ? "✓ " : ""}{quest.title}</strong>
                <span>{Math.min(quest.progress, quest.target)}/{quest.target}</span>
              </div>
              <p>{quest.description}</p>
              <div className="quest-progress">
                <span style={{ width: `${ratio * 100}%` }} />
              </div>
              <small>{quest.reward}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
