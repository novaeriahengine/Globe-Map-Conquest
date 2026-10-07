import { FLAG_PRESETS } from "../game/flags";
import type { FlagPresetId } from "../game/types";

export function FlagPreview({
  presetId,
  small = false
}: {
  presetId: FlagPresetId;
  small?: boolean;
}) {
  const preset = FLAG_PRESETS.find((item) => item.id === presetId) ?? FLAG_PRESETS[0];

  return (
    <div
      className={small ? "flag-preview flag-preview-small" : "flag-preview"}
      style={preset.style}
      title={preset.name}
    >
      {preset.symbol && <span>{preset.symbol}</span>}
    </div>
  );
}
