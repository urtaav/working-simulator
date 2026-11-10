// What a dock change should do. main.js keeps state.scene equal to the running scene
// (also after a rotation), so a scene pick is any difference from `prev`.
export function planDockChange(prev, next, runningScene) {
  const skin = next.editor !== prev.editor ? next.editor : null;
  // scenes lay out per editor (tab names, panel kind), so a skin change restarts the scene
  const startScene = next.scene !== prev.scene ? next.scene : skin ? runningScene : null;
  return { skin, startScene, reschedule: next.rotateMinutes !== prev.rotateMinutes };
}
